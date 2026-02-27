import { randomUUID } from "crypto"
import { createEditorAsset } from "@/lib/editor/assets"
import { sql } from "@/lib/editor/repository"
import { CloudStorage } from "@/lib/cloud-storage"
import { generateModelTextWithFallback, resolveModelSelection } from "@/lib/ai/provider-registry"

type RenderJobRow = {
  id: string
  project_id: string
  owner_id: string
  payload: Record<string, unknown>
  result: Record<string, unknown>
}

interface RenderJobResult {
  attemptCount: number
  startedAt: string | null
  finishedAt: string | null
  lastError: string | null
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

export interface EditorRenderModelProviderAdapter {
  render(payload: Record<string, unknown>): Promise<RenderOutput>
}

const defaultModelProviderAdapter: EditorRenderModelProviderAdapter = {
  async render(payload) {
    const provider = typeof payload.provider === "string" ? payload.provider : undefined
    const model = typeof payload.model === "string" ? payload.model : undefined
    const selection = resolveModelSelection(model, provider)
    const prompt = typeof payload.prompt === "string" && payload.prompt.trim().length > 0 ? payload.prompt : "Render editor output"
    const renderResult = await generateModelTextWithFallback(selection, {
      prompt,
      systemPrompt: "Generate deterministic editor render metadata output.",
      maxTokens: 800,
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
    progress: typeof objectValue.progress === "number" ? objectValue.progress : 0,
    stage: typeof objectValue.stage === "string" ? objectValue.stage : "queued",
  }
}

function sanitizePublicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown render worker error"

  return message
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b(sk|pk|rk)_[a-z0-9]{8,}\b/gi, "[redacted]")
    .slice(0, 280)
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
    RETURNING j.id, j.project_id, j.owner_id, j.payload, j.result
  `) as RenderJobRow[]

  return rows[0] ?? null
}

async function saveResult(jobId: string, status: "queued" | "completed" | "failed", result: RenderJobResult, outputAssetId?: string) {
  await sql`
    UPDATE editor_render_jobs
    SET status=${status},
        result=${JSON.stringify(result)}::jsonb,
        output_asset_id=COALESCE(${outputAssetId ?? null}, output_asset_id),
        updated_at=now()
    WHERE id=${jobId}
  `
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
    progress: 10,
    stage: "processing",
  }

  await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(processingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

  try {
    const preparingResult: RenderJobResult = {
      ...processingResult,
      progress: 35,
      stage: "Rendering frames",
    }
    await sql`UPDATE editor_render_jobs SET result=${JSON.stringify(preparingResult)}::jsonb, updated_at=now() WHERE id=${job.id}`

    const renderedOutput = await adapter.render(job.payload ?? {})
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
    const publicError = sanitizePublicError(error)
    const nextStatus = attemptCount < maxAttempts ? "queued" : "failed"
    const failedResult: RenderJobResult = {
      ...processingResult,
      finishedAt: nextStatus === "failed" ? new Date().toISOString() : null,
      lastError: publicError,
      progress: nextStatus === "failed" ? 100 : 0,
      stage: nextStatus === "failed" ? "failed" : "queued",
    }

    await saveResult(job.id, nextStatus, failedResult)
    return { jobId: job.id, status: nextStatus, error: publicError }
  }
}

export async function processEditorRenderQueue(limit = 5, adapter: EditorRenderModelProviderAdapter = defaultModelProviderAdapter) {
  const outcomes: Array<{ jobId: string; status: "completed" | "queued" | "failed"; outputAssetId?: string; error?: string }> = []

  for (let index = 0; index < limit; index += 1) {
    const outcome = await processNextEditorRenderJob(adapter)
    if (!outcome) break
    outcomes.push(outcome)
  }

  return outcomes
}
