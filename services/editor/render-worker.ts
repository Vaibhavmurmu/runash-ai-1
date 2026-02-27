import { randomUUID } from "crypto"
import { createEditorAsset } from "@/lib/editor/assets"
import { sql } from "@/lib/editor/repository"
import { CloudStorage } from "@/lib/cloud-storage"
import { AIProviderError, generateModelTextWithFallback, resolveModelSelection } from "@/lib/ai/provider-registry"

type RenderJobRow = {
  id: string
  project_id: string
  owner_id: string
  payload: Record<string, unknown>
  result: Record<string, unknown>
  status: string
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
  }
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

const defaultModelProviderAdapter: EditorRenderModelProviderAdapter = {
  async render(payload, context) {
    const provider = typeof payload.provider === "string" ? payload.provider : undefined
    const model = typeof payload.model === "string" ? payload.model : undefined
    const selection = resolveModelSelection(model, provider)
    const prompt = typeof payload.prompt === "string" && payload.prompt.trim().length > 0 ? payload.prompt : "Render editor output"

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

    logProviderEvent("provider-response", {
      jobId: context.jobId,
      provider: renderResult.provider,
      model: renderResult.model,
      preview: renderResult.text.slice(0, 120),
    })

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
      },
    }
  },
}

const maxAttempts = Number(process.env.EDITOR_RENDER_MAX_ATTEMPTS ?? 3)

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
  if (error instanceof AIProviderError) return `PROVIDER_${error.code}`
  if (error instanceof Error && error.name === "AbortError") return "REQUEST_ABORTED"
  if (error instanceof Error && /timeout/i.test(error.message)) return "PROVIDER_TIMEOUT"
  return "RENDER_FAILED"
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AIProviderError) {
    return error.code === "TIMEOUT" || error.code === "QUOTA" || error.code === "UPSTREAM"
  }

  if (error instanceof Error && error.name === "AbortError") return true
  return error instanceof Error && /timeout|temporar|unavailable|rate limit/i.test(error.message)
}

function redactSensitiveData(value: unknown): unknown {
  if (value === null || typeof value === "undefined") return value

  if (typeof value === "string") {
    return value
      .replace(/\b(sk|pk|rk)_[a-z0-9]{8,}\b/gi, "[redacted]")
      .replace(/(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
  }

  if (Array.isArray(value)) return value.map((entry) => redactSensitiveData(entry))

  if (typeof value === "object") {
    const source = value as Record<string, unknown>
    const output: Record<string, unknown> = {}

    for (const [key, nested] of Object.entries(source)) {
      if (/api[_-]?key|token|secret|password|authorization|prompt|content|negativeprompt/i.test(key)) {
        output[key] = "[redacted]"
      } else {
        output[key] = redactSensitiveData(nested)
      }
    }

    return output
  }

  return value
}

function logProviderEvent(event: string, payload: Record<string, unknown>) {
  console.info(`[editor-render-worker] ${event}`, redactSensitiveData(payload))
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

async function claimNextQueuedJob() {
  const rows = (await sql`
    WITH candidate AS (
      SELECT id
      FROM editor_render_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE editor_render_jobs j
    SET status = 'processing',
        updated_at = now()
    FROM candidate
    WHERE j.id = candidate.id
    RETURNING j.id, j.project_id, j.owner_id, j.payload, j.result, j.status
  `) as RenderJobRow[]

  return rows[0] ?? null
}

async function fetchJobStatus(jobId: string): Promise<string | null> {
  const [row] = (await sql`SELECT status FROM editor_render_jobs WHERE id=${jobId} LIMIT 1`) as Array<{ status: string }>
  return row?.status ?? null
}

async function saveResult(jobId: string, status: "queued" | "completed" | "failed" | "canceled", result: RenderJobResult, outputAssetId?: string) {
  await sql`
    UPDATE editor_render_jobs
    SET status=${status},
        result=${JSON.stringify(result)}::jsonb,
        output_asset_id=COALESCE(${outputAssetId ?? null}, output_asset_id),
        updated_at=now()
    WHERE id=${jobId}
  `
}

async function ensureNotCanceled(jobId: string) {
  const status = await fetchJobStatus(jobId)
  if (status === "canceled") {
    throw new AIProviderError("Render job canceled", "BAD_REQUEST")
  }
}

async function runWithProviderRetries(
  job: RenderJobRow,
  adapter: EditorRenderModelProviderAdapter,
  policy: { provider: string; model: string; timeoutMs: number; retryLimit: number },
): Promise<RenderOutput> {
  let lastError: unknown

  for (let attempt = 0; attempt <= policy.retryLimit; attempt += 1) {
    const controller = new AbortController()
    const cancellationInterval = setInterval(() => {
      void fetchJobStatus(job.id).then((status) => {
        if (status === "canceled") {
          controller.abort()
        }
      })
    }, 500)

    try {
      await ensureNotCanceled(job.id)

      logProviderEvent("provider-request", {
        jobId: job.id,
        provider: policy.provider,
        model: policy.model,
        attempt: attempt + 1,
        timeoutMs: policy.timeoutMs,
        payload: job.payload,
      })

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
      if (!isRetryable(error) || attempt >= policy.retryLimit) {
        throw error
      }
    } finally {
      clearInterval(cancellationInterval)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Render provider failed")
}

export async function processNextEditorRenderJob(adapter: EditorRenderModelProviderAdapter = defaultModelProviderAdapter) {
  const job = await claimNextQueuedJob()
  if (!job) return null

  const nowIso = new Date().toISOString()
  const previousResult = parseResult(job.result)
  const attemptCount = previousResult.attemptCount + 1

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

  await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(processingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

  try {
    await ensureNotCanceled(job.id)

    const preparingResult: RenderJobResult = {
      ...processingResult,
      progress: 35,
      stage: "Rendering frames",
    }
    await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(preparingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

    const providerPolicy = resolveProviderPolicy(job.payload ?? {})
    const renderedOutput = await runWithProviderRetries(job, adapter, providerPolicy)
    await ensureNotCanceled(job.id)

    const storageKey = `editor/renders/${job.project_id}/${job.id}/${randomUUID()}.${renderedOutput.fileExtension}`

    const uploadingResult: RenderJobResult = {
      ...preparingResult,
      progress: 75,
      stage: "Uploading output",
    }
    await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(uploadingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

    const accessUrl = await CloudStorage.uploadFile(storageKey, renderedOutput.buffer, renderedOutput.mimeType)

    const asset = await createEditorAsset({
      projectId: job.project_id,
      ownerId: job.owner_id,
      source: "storage",
      storageKey,
      accessUrl,
      mimeType: renderedOutput.mimeType,
      sizeBytes: renderedOutput.buffer.byteLength,
      metadata: {
        renderJobId: job.id,
        ...(renderedOutput.metadata ?? {}),
      },
    })

    const completedResult: RenderJobResult = {
      ...uploadingResult,
      finishedAt: new Date().toISOString(),
      lastError: null,
      errorCode: null,
      progress: 100,
      stage: "completed",
      output: {
        mimeType: renderedOutput.mimeType,
        sizeBytes: renderedOutput.buffer.byteLength,
        storageKey,
      },
    }

    await saveResult(job.id, "completed", completedResult, asset.id)
    return { jobId: job.id, status: "completed" as const, outputAssetId: asset.id }
  } catch (error) {
    const status = await fetchJobStatus(job.id)
    if (status === "canceled") {
      const canceledResult: RenderJobResult = {
        ...processingResult,
        finishedAt: new Date().toISOString(),
        progress: 100,
        stage: "canceled",
        lastError: null,
        errorCode: "CANCELED",
      }

      await saveResult(job.id, "canceled", canceledResult)
      return { jobId: job.id, status: "canceled" as const }
    }

    const publicError = sanitizePublicError(error)
    const errorCode = stableErrorCode(error)
    const nextStatus = attemptCount < maxAttempts ? "queued" : "failed"
    const failedResult: RenderJobResult = {
      ...processingResult,
      finishedAt: nextStatus === "failed" ? new Date().toISOString() : null,
      lastError: publicError,
      errorCode,
      progress: nextStatus === "failed" ? 100 : 0,
      stage: nextStatus === "failed" ? "failed" : "queued",
    }

    logProviderEvent("provider-failure", {
      jobId: job.id,
      code: errorCode,
      message: publicError,
      nextStatus,
    })

    await saveResult(job.id, nextStatus, failedResult)
    return { jobId: job.id, status: nextStatus, error: publicError, errorCode }
  }
}

export async function processEditorRenderQueue(limit = 5, adapter: EditorRenderModelProviderAdapter = defaultModelProviderAdapter) {
  const outcomes: Array<{ jobId: string; status: "completed" | "queued" | "failed" | "canceled"; outputAssetId?: string; error?: string }> = []

  for (let index = 0; index < limit; index += 1) {
    const outcome = await processNextEditorRenderJob(adapter)
    if (!outcome) break
    outcomes.push(outcome)
  }

  return outcomes
}
