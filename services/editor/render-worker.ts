import { randomUUID } from "crypto"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"
import {
  assertRenderJobTransition,
  computeRetryBackoffMs,
  mergeIdempotentCompletion,
  normalizeProviderOutput,
  type EditorRenderOrchestrationStatus,
} from "@/lib/editor/render-orchestration"
import { CloudStorage } from "@/lib/cloud-storage"
import { AIProviderError, generateModelTextWithFallback, resolveModelSelection } from "@/lib/ai/provider-registry"


type RenderJobRow = {
  id: string
  project_id: string
  owner_id: string
  requested_by: string
  payload: Record<string, unknown>
  result: Record<string, unknown>
  output_asset_id: string | null
  status: EditorRenderOrchestrationStatus
  created_at: string
  updated_at: string
  attempt_count: number
  max_attempts: number
  cancellation_token: string | null
}

interface RenderJobResult {
  attemptCount: number
  startedAt: string | null
  finishedAt: string | null
  lastError: string | null
  errorCode?: string | null
  progress: number
  stage: string
  output?: {
    mimeType: string
    sizeBytes: number
    storageKey: string
    checksum?: string
  }
  metadata?: Record<string, unknown>
}

interface RenderOutput {
  buffer: Buffer
  mimeType: string
  fileExtension: string
  metadata?: Record<string, unknown>
}

interface RenderExecutionContext {
  signal: AbortSignal
  timeoutMs: number
  retryLimit: number
  provider: string
  model: string
  jobId: string
}

export interface EditorRenderModelProviderAdapter {
  render(payload: Record<string, unknown>, context: RenderExecutionContext): Promise<RenderOutput>
}

const providerPolicyDefaults = {
  timeoutMs: Number(process.env.EDITOR_RENDER_PROVIDER_TIMEOUT_MS ?? 20000),
  retries: Number(process.env.EDITOR_RENDER_PROVIDER_RETRIES ?? 2),
}

const providerPolicyByProvider: Record<string, { timeoutMs: number; retries: number }> = {
  runway: {
    timeoutMs: Number(process.env.EDITOR_RENDER_PROVIDER_TIMEOUT_RUNWAY_MS ?? providerPolicyDefaults.timeoutMs),
    retries: Number(process.env.EDITOR_RENDER_PROVIDER_RETRIES_RUNWAY ?? providerPolicyDefaults.retries),
  },
  stability: {
    timeoutMs: Number(process.env.EDITOR_RENDER_PROVIDER_TIMEOUT_STABILITY_MS ?? providerPolicyDefaults.timeoutMs),
    retries: Number(process.env.EDITOR_RENDER_PROVIDER_RETRIES_STABILITY ?? providerPolicyDefaults.retries),
  },
  wan: {
    timeoutMs: Number(process.env.EDITOR_RENDER_PROVIDER_TIMEOUT_WAN_MS ?? providerPolicyDefaults.timeoutMs),
    retries: Number(process.env.EDITOR_RENDER_PROVIDER_RETRIES_WAN ?? providerPolicyDefaults.retries),
  },
}

const providerCircuitState = new Map<string, { failures: number; openUntil: number }>()
const providerCircuitThreshold = Number(process.env.EDITOR_RENDER_CIRCUIT_BREAKER_THRESHOLD ?? 3)
const providerCircuitOpenMs = Number(process.env.EDITOR_RENDER_CIRCUIT_BREAKER_WINDOW_MS ?? 20_000)

const defaultModelProviderAdapter: EditorRenderModelProviderAdapter = {
  async render(payload, context) {
    const provider = typeof payload.provider === "string" ? payload.provider : undefined
    const model = typeof payload.model === "string" ? payload.model : undefined
    const selection = resolveModelSelection(model, provider)
    const prompt = typeof payload.prompt === "string" && payload.prompt.trim().length > 0 ? payload.prompt : "Render editor output"

    const started = Date.now()
    const renderResult = await withTimeout(
      () =>
        generateModelTextWithFallback(selection, {
          prompt,
          systemPrompt: "Generate deterministic editor render metadata output.",
          maxTokens: 800,
        }),
      context.timeoutMs,
      context.signal,
    )

    const outputBody = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        content: renderResult.text,
      },
      null,
      2,
    )

    return {
      buffer: Buffer.from(outputBody, "utf-8"),
      mimeType: "application/json",
      fileExtension: "json",
      metadata: {
        provider: selection.provider,
        model: selection.model,
        latencyMs: Date.now() - started,
        finishReason: "stop",
      },
    }
  },
}

function parseResult(value: unknown): RenderJobResult {
  const objectValue = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    attemptCount: Number(objectValue.attemptCount ?? 0),
    startedAt: typeof objectValue.startedAt === "string" ? objectValue.startedAt : null,
    finishedAt: typeof objectValue.finishedAt === "string" ? objectValue.finishedAt : null,
    lastError: typeof objectValue.lastError === "string" ? objectValue.lastError : null,
    errorCode: typeof objectValue.errorCode === "string" ? objectValue.errorCode : null,
    progress: typeof objectValue.progress === "number" ? objectValue.progress : 0,
    stage: typeof objectValue.stage === "string" ? objectValue.stage : "queued",
    output: objectValue.output && typeof objectValue.output === "object" ? (objectValue.output as RenderJobResult["output"]) : undefined,
    metadata: objectValue.metadata && typeof objectValue.metadata === "object" ? (objectValue.metadata as Record<string, unknown>) : undefined,
  }
}

function sanitizePublicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown render worker error"

  return message
    .replace(/(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b(sk|pk|rk)_[a-z0-9]{8,}\b/gi, "[redacted]")
    .slice(0, 280)
}

function stableErrorCode(error: unknown): string {
  if (error instanceof AIProviderError) {
    if (error.code === "TIMEOUT") return "EDITOR_RENDER_TIMEOUT"
    if (error.code === "QUOTA") return "EDITOR_RENDER_PROVIDER_QUOTA"
    if (error.code === "UPSTREAM") return "EDITOR_RENDER_PROVIDER_UNAVAILABLE"
    return `EDITOR_RENDER_PROVIDER_${error.code}`
  }

  if (error instanceof Error && error.name === "AbortError") return "EDITOR_RENDER_CANCELED"
  if (error instanceof Error && /timeout/i.test(error.message)) return "EDITOR_RENDER_TIMEOUT"
  return "EDITOR_RENDER_FAILED"
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    return error.code === "TIMEOUT" || error.code === "QUOTA" || error.code === "UPSTREAM"
  }

  if (error instanceof Error && error.name === "AbortError") return false
  return error instanceof Error && /timeout|temporar|unavailable|rate limit|circuit/i.test(error.message)
}

async function withTimeout<T>(factory: () => Promise<T>, timeoutMs: number, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")

  let timeout: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new AIProviderError("Provider request timeout", "TIMEOUT")), timeoutMs)
  })

  const abortPromise = new Promise<never>((_, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })

  try {
    return await Promise.race([factory(), timeoutPromise, abortPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function getProviderRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const providerRequest = payload.providerRequest
  if (providerRequest && typeof providerRequest === "object") {
    return providerRequest as Record<string, unknown>
  }

  return payload
}

function resolveProviderPolicy(payload: Record<string, unknown>) {
  const provider = typeof payload.provider === "string" ? payload.provider : "default"
  const model = typeof payload.model === "string" ? payload.model : "unknown"
  const policy = providerPolicyByProvider[provider] ?? providerPolicyDefaults

  return {
    provider,
    model,
    timeoutMs: Math.max(1000, policy.timeoutMs),
    retryLimit: Math.max(0, policy.retries),
  }
}

function isCircuitOpen(provider: string) {
  const state = providerCircuitState.get(provider)
  if (!state) return false
  if (state.openUntil <= Date.now()) {
    providerCircuitState.delete(provider)
    return false
  }
  return state.failures >= providerCircuitThreshold
}

function registerProviderOutcome(provider: string, success: boolean) {
  if (success) {
    providerCircuitState.delete(provider)
    return
  }

  const existing = providerCircuitState.get(provider) ?? { failures: 0, openUntil: 0 }
  const failures = existing.failures + 1
  const openUntil = failures >= providerCircuitThreshold ? Date.now() + providerCircuitOpenMs : existing.openUntil
  providerCircuitState.set(provider, { failures, openUntil })
}

async function claimNextQueuedJob() {
  const rows = (await sql`
    WITH candidate AS (
      SELECT id
      FROM editor_render_jobs
      WHERE status IN ('queued', 'retrying')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE editor_render_jobs j
    SET status = 'processing',
        updated_at = now()
    FROM candidate
    WHERE j.id = candidate.id
    RETURNING j.*
  `) as RenderJobRow[]

  const job = rows[0] ?? null
  if (job) {
    await recordTimeline(job.id, job.owner_id, null, "processing", "worker_claimed", { attemptCount: job.attempt_count })
    publishRenderJobEvent(mapJob(job))
  }

  return job
}

function mapJob(row: Record<string, any>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    ownerId: String(row.owner_id),
    status: String(row.status) as EditorRenderOrchestrationStatus,
    requestedBy: typeof row.requested_by === "string" ? row.requested_by : "",
    payload: row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {},
    result: row.result && typeof row.result === "object" ? (row.result as Record<string, unknown>) : {},
    outputAssetId: typeof row.output_asset_id === "string" ? row.output_asset_id : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  }
}

async function fetchJobControl(jobId: string): Promise<{ status: string; cancellationToken: string | null } | null> {
  const [row] = (await sql`
    SELECT status, cancellation_token
    FROM editor_render_jobs
    WHERE id=${jobId}
    LIMIT 1
  `) as Array<{ status: string; cancellation_token: string | null }>

  if (!row) return null
  return { status: row.status, cancellationToken: row.cancellation_token }
}

async function recordTimeline(
  jobId: string,
  ownerId: string,
  fromStatus: string | null,
  toStatus: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  await sql`
    INSERT INTO editor_render_job_timeline (job_id, owner_id, from_status, to_status, event_type, event_payload)
    VALUES (${jobId}, ${ownerId}, ${fromStatus}, ${toStatus}, ${eventType}, ${JSON.stringify(payload)}::jsonb)
  `
}

async function saveResult(
  job: RenderJobRow,
  status: EditorRenderOrchestrationStatus,
  result: RenderJobResult,
  options?: { nextRetryAt?: string | null; lastErrorCode?: string | null; providerTrace?: Record<string, unknown> },
): Promise<boolean> {
  const [row] = (await sql`
    UPDATE editor_render_jobs
    SET status=${status},
        result=${JSON.stringify(result)}::jsonb,
        next_retry_at=${options?.nextRetryAt ?? null},
        last_error_code=${options?.lastErrorCode ?? null},
        provider_trace=COALESCE(provider_trace, '{}'::jsonb) || ${JSON.stringify(options?.providerTrace ?? {})}::jsonb,
        updated_at=now()
    WHERE id=${job.id}
      AND status <> 'canceled'
    RETURNING *
  `) as Array<Record<string, unknown>>

  if (!row) return false
  await recordTimeline(job.id, job.owner_id, job.status, String(row.status), "status_transition", {
    stage: result.stage,
    progress: result.progress,
    errorCode: options?.lastErrorCode ?? null,
  })
  publishRenderJobEvent(mapJob(row))
  return true
}

async function ensureNotCanceled(job: RenderJobRow, expectedToken: string | null) {
  const control = await fetchJobControl(job.id)
  if (!control) throw new DOMException("Missing job", "AbortError")
  if (control.status === "canceled") throw new DOMException("Canceled", "AbortError")
  if (expectedToken && control.cancellationToken !== expectedToken) throw new DOMException("Canceled", "AbortError")
}

async function persistCompletionAtomically(job: RenderJobRow, renderedOutput: RenderOutput, providerOutput: Record<string, unknown>) {
  const storageKey = `editor/renders/${job.project_id}/${job.id}/${randomUUID()}.${renderedOutput.fileExtension}`
  const accessUrl = await CloudStorage.uploadFile(storageKey, renderedOutput.buffer, renderedOutput.mimeType)

  const completionOutput = {
    mimeType: renderedOutput.mimeType,
    sizeBytes: renderedOutput.buffer.byteLength,
    storageKey,
    checksum: `${renderedOutput.buffer.byteLength}:${renderedOutput.mimeType}`,
  }

  await sql`BEGIN`
  try {
    const [asset] = await sql`
      INSERT INTO editor_assets (project_id, owner_id, source, upload_file_id, storage_key, access_url, mime_type, size_bytes, metadata)
      VALUES (
        ${job.project_id},
        ${job.owner_id},
        'storage',
        null,
        ${storageKey},
        ${accessUrl},
        ${renderedOutput.mimeType},
        ${renderedOutput.buffer.byteLength},
        ${JSON.stringify({ renderJobId: job.id, ...providerOutput })}::jsonb
      )
      RETURNING *
    `

    const [updatedJob] = await sql`
      UPDATE editor_render_jobs
      SET status='completed',
          output_asset_id=${asset.id},
          provider_output=${JSON.stringify(providerOutput)}::jsonb,
          output_publication=${JSON.stringify({ assetId: asset.id, storageKey, publishedAt: new Date().toISOString() })}::jsonb,
          updated_at=now()
      WHERE id=${job.id}
      RETURNING *
    `

    await sql`COMMIT`

    return { updatedJob, asset, completionOutput }
  } catch (error) {
    await sql`ROLLBACK`
    throw error
  }
}

async function recordDeadLetter(job: RenderJobRow, errorCode: string, errorMessage: string) {
  await sql`
    INSERT INTO editor_render_job_dead_letters (job_id, owner_id, project_id, failure_code, failure_message, snapshot, updated_at)
    VALUES (
      ${job.id},
      ${job.owner_id},
      ${job.project_id},
      ${errorCode},
      ${errorMessage},
      ${JSON.stringify({ payload: job.payload, result: job.result, attemptCount: job.attempt_count })}::jsonb,
      now()
    )
    ON CONFLICT (job_id)
    DO UPDATE SET
      failure_code=EXCLUDED.failure_code,
      failure_message=EXCLUDED.failure_message,
      snapshot=EXCLUDED.snapshot,
      updated_at=now()
  `
}

async function runWithProviderRetries(
  job: RenderJobRow,
  adapter: EditorRenderModelProviderAdapter,
  policy: { provider: string; model: string; timeoutMs: number; retryLimit: number },
): Promise<RenderOutput> {
  let lastError: unknown

  for (let attempt = 0; attempt <= policy.retryLimit; attempt += 1) {
    if (isCircuitOpen(policy.provider)) {
      lastError = new Error(`Provider circuit open for ${policy.provider}`)
      break
    }

    const controller = new AbortController()
    try {
      await ensureNotCanceled(job, job.cancellation_token)
      return await adapter.render(job.payload ?? {}, {
        signal: controller.signal,
        timeoutMs: policy.timeoutMs,
        retryLimit: policy.retryLimit,
        provider: policy.provider,
        model: policy.model,
        jobId: job.id,
      })
    } catch (error) {
      lastError = error
      registerProviderOutcome(policy.provider, false)
      if (!isRetryable(error) || attempt >= policy.retryLimit) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, computeRetryBackoffMs(attempt + 1)))
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Render provider failed")
}

export async function processNextEditorRenderJob(adapter: EditorRenderModelProviderAdapter = defaultModelProviderAdapter) {
  const job = await claimNextQueuedJob()
  if (!job) return null

  const nowIso = new Date().toISOString()
  const previousResult = parseResult(job.result)
  const attemptCount = (job.attempt_count ?? previousResult.attemptCount) + 1

  const processingResult: RenderJobResult = {
    ...previousResult,
    attemptCount,
    startedAt: nowIso,
    finishedAt: null,
    lastError: null,
    errorCode: null,
    progress: 10,
    stage: "processing",
  }

  await sql`UPDATE editor_render_jobs SET attempt_count=${attemptCount}, result=${JSON.stringify(processingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

  try {
    const providerRequestPayload = getProviderRequestPayload(job.payload ?? {})
    const providerPolicy = resolveProviderPolicy(providerRequestPayload)
    const renderedOutput = await runWithProviderRetries({ ...job, payload: providerRequestPayload }, adapter, providerPolicy)
    registerProviderOutcome(providerPolicy.provider, true)
    await ensureNotCanceled(job, job.cancellation_token)

    const providerOutput = normalizeProviderOutput({
      ...(renderedOutput.metadata ?? {}),
      provider: providerPolicy.provider,
      model: providerPolicy.model,
    })

    const persisted = await persistCompletionAtomically(job, renderedOutput, providerOutput)
    const completedResult = mergeIdempotentCompletion(previousResult, {
      ...processingResult,
      finishedAt: new Date().toISOString(),
      progress: 100,
      stage: "completed",
      output: persisted.completionOutput,
      metadata: {
        ...(processingResult.metadata ?? {}),
        providerOutput,
      },
    })

    await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(completedResult)}::jsonb, updated_at=now() WHERE id=${job.id}`
    await recordTimeline(job.id, job.owner_id, "processing", "completed", "asset_published", {
      outputAssetId: persisted.asset.id,
      storageKey: persisted.completionOutput.storageKey,
    })
    publishRenderJobEvent(mapJob(persisted.updatedJob))

    return { jobId: job.id, status: "completed" as const, outputAssetId: persisted.asset.id }
  } catch (error) {
    const publicError = sanitizePublicError(error)
    const errorCode = stableErrorCode(error)

    if (errorCode === "EDITOR_RENDER_CANCELED") {
      const canceledResult: RenderJobResult = {
        ...processingResult,
        finishedAt: new Date().toISOString(),
        progress: 100,
        stage: "canceled",
        lastError: null,
        errorCode,
      }
      await sql`UPDATE editor_render_jobs SET status='canceled', canceled_at=now(), result=${JSON.stringify(canceledResult)}::jsonb, updated_at=now() WHERE id=${job.id}`
      await recordTimeline(job.id, job.owner_id, "processing", "canceled", "canceled", { errorCode })
      return { jobId: job.id, status: "canceled" as const }
    }

    const maxAttempts = Number(job.max_attempts ?? Number(process.env.EDITOR_RENDER_MAX_ATTEMPTS ?? 3))
    const willRetry = attemptCount < maxAttempts
    if (willRetry) {
      assertRenderJobTransition("processing", "retrying")
      const delayMs = computeRetryBackoffMs(attemptCount)
      const retryAt = new Date(Date.now() + delayMs).toISOString()
      const retryingResult: RenderJobResult = {
        ...processingResult,
        stage: "retrying",
        progress: 0,
        lastError: publicError,
        errorCode,
        metadata: {
          ...(processingResult.metadata ?? {}),
          retry: { attemptCount, maxAttempts, retryAt, delayMs },
        },
      }
      await saveResult(job, "retrying", retryingResult, {
        nextRetryAt: retryAt,
        lastErrorCode: errorCode,
        providerTrace: { lastFailureAt: new Date().toISOString(), errorCode },
      })
      return { jobId: job.id, status: "retrying" as const, error: publicError, errorCode }
    }

    const failedResult: RenderJobResult = {
      ...processingResult,
      finishedAt: new Date().toISOString(),
      stage: "failed",
      progress: 100,
      lastError: publicError,
      errorCode,
    }

    await saveResult(job, "failed", failedResult, {
      nextRetryAt: null,
      lastErrorCode: errorCode,
      providerTrace: { terminalFailureAt: new Date().toISOString(), errorCode },
    })
    await recordDeadLetter(job, errorCode, publicError)
    return { jobId: job.id, status: "failed" as const, error: publicError, errorCode }
  }
}

export async function processEditorRenderQueue(limit = 5, adapter: EditorRenderModelProviderAdapter = defaultModelProviderAdapter) {
  const outcomes: Array<{ jobId: string; status: "completed" | "retrying" | "failed" | "canceled"; outputAssetId?: string; error?: string }> = []

  for (let index = 0; index < limit; index += 1) {
    const outcome = await processNextEditorRenderJob(adapter)
    if (!outcome) break
    outcomes.push(outcome)
  }

  return outcomes
}
