import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { buildInvalidRequestError, editorRenderJobCreateRequestSchema, formatZodIssues } from "@/lib/api/contracts"
import { compileTimelineToVideoGenerationRequest, TimelineCompilationError } from "@/lib/editor/generation/compile-timeline"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { getProjectById, sql } from "@/lib/editor/repository"
import { buildGenerationDefaults, executeVideoModelById, validateGenerationConfig } from "@/lib/editor/video-models/registry"
import {
  mapVideoModelExecutionError,
  normalizeVideoGenerationPayload,
  validateVideoGenerationPayload,
} from "@/lib/editor/video-models/validation"

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = Number(process.env.EDITOR_RENDER_RATE_LIMIT_WINDOW_SECONDS ?? 300)
const DEFAULT_USER_RATE_LIMIT = Number(process.env.EDITOR_RENDER_RATE_LIMIT_USER ?? 20)
const DEFAULT_PROJECT_RATE_LIMIT = Number(process.env.EDITOR_RENDER_RATE_LIMIT_PROJECT ?? 8)
const DEFAULT_ACTIVE_USER_QUOTA = Number(process.env.EDITOR_RENDER_ACTIVE_QUOTA_USER ?? 12)
const DEFAULT_ACTIVE_PROJECT_QUOTA = Number(process.env.EDITOR_RENDER_ACTIVE_QUOTA_PROJECT ?? 6)
const DEFAULT_MAX_DURATION_SECONDS = Number(process.env.EDITOR_RENDER_MAX_DURATION_SECONDS ?? 120)
const DEFAULT_MAX_RESOLUTION_PIXELS = Number(process.env.EDITOR_RENDER_MAX_RESOLUTION_PIXELS ?? 3686400)

const modelTierOrder = ["standard", "pro", "enterprise"] as const
type ModelTier = (typeof modelTierOrder)[number]

function mapRenderJobRow(row: Record<string, any>) {
  return {
    id: row.id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    status: row.status,
    requestedBy: row.requested_by,
    payload: row.payload ?? {},
    result: row.result ?? {},
    outputAssetId: row.output_asset_id,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    nextRetryAt: row.next_retry_at ?? null,
    cancellationToken: row.cancellation_token ?? null,
    canceledAt: row.canceled_at ?? null,
    lastErrorCode: row.last_error_code ?? null,
    providerTrace: row.provider_trace ?? {},
    providerOutput: row.provider_output ?? {},
    outputPublication: row.output_publication ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseResolution(resolution?: string): { width: number; height: number } | null {
  if (!resolution) return null
  const matched = /^(\d{2,5})x(\d{2,5})$/i.exec(resolution.trim())
  if (!matched) return null

  return {
    width: Number(matched[1]),
    height: Number(matched[2]),
  }
}

function inferModelTier(modelId: string): ModelTier {
  const normalizedModelId = modelId.toLowerCase()
  if (/(enterprise|ultra|max)/.test(normalizedModelId)) return "enterprise"
  if (/(pro|plus|xl)/.test(normalizedModelId)) return "pro"
  return "standard"
}

function parseTier(rawTier: string | undefined): ModelTier {
  const normalized = rawTier?.toLowerCase()
  return modelTierOrder.find((tier) => tier === normalized) ?? "pro"
}

async function enforceRenderRateLimits(ownerId: string, projectId: string) {
  const [counts] = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE owner_id=${ownerId}
          AND created_at >= now() - make_interval(secs => ${DEFAULT_RATE_LIMIT_WINDOW_SECONDS})
      )::int AS user_window_count,
      COUNT(*) FILTER (
        WHERE owner_id=${ownerId}
          AND project_id=${projectId}
          AND created_at >= now() - make_interval(secs => ${DEFAULT_RATE_LIMIT_WINDOW_SECONDS})
      )::int AS project_window_count
    FROM editor_render_jobs
  `

  const userWindowCount = Number(counts?.user_window_count ?? 0)
  const projectWindowCount = Number(counts?.project_window_count ?? 0)

  if (userWindowCount >= DEFAULT_USER_RATE_LIMIT) {
    return {
      status: 429,
      payload: {
        error: "Render request limit reached for this user",
        code: "EDITOR_RENDER_RATE_LIMIT_USER",
        windowSeconds: DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      },
    }
  }

  if (projectWindowCount >= DEFAULT_PROJECT_RATE_LIMIT) {
    return {
      status: 429,
      payload: {
        error: "Render request limit reached for this project",
        code: "EDITOR_RENDER_RATE_LIMIT_PROJECT",
        windowSeconds: DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      },
    }
  }

  return null
}

async function enforceRenderQuotas(ownerId: string, projectId: string) {
  const [counts] = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE owner_id=${ownerId}
          AND status IN ('queued', 'processing', 'retrying')
      )::int AS user_active_count,
      COUNT(*) FILTER (
        WHERE owner_id=${ownerId}
          AND project_id=${projectId}
          AND status IN ('queued', 'processing', 'retrying')
      )::int AS project_active_count
    FROM editor_render_jobs
  `

  const userActiveCount = Number(counts?.user_active_count ?? 0)
  const projectActiveCount = Number(counts?.project_active_count ?? 0)

  if (userActiveCount >= DEFAULT_ACTIVE_USER_QUOTA) {
    return {
      status: 429,
      payload: {
        error: "Active render quota reached for this user",
        code: "EDITOR_RENDER_QUOTA_USER_ACTIVE",
        maxActiveJobs: DEFAULT_ACTIVE_USER_QUOTA,
      },
    }
  }

  if (projectActiveCount >= DEFAULT_ACTIVE_PROJECT_QUOTA) {
    return {
      status: 429,
      payload: {
        error: "Active render quota reached for this project",
        code: "EDITOR_RENDER_QUOTA_PROJECT_ACTIVE",
        maxActiveJobs: DEFAULT_ACTIVE_PROJECT_QUOTA,
      },
    }
  }

  return null
}

function enforceRenderInputLimits(payload: Record<string, unknown>) {
  const durationSeconds = typeof payload.durationSeconds === "number" ? payload.durationSeconds : null
  if (durationSeconds && durationSeconds > DEFAULT_MAX_DURATION_SECONDS) {
    return {
      status: 400,
      payload: {
        error: "Requested duration exceeds the maximum allowed duration",
        code: "EDITOR_RENDER_MAX_DURATION_EXCEEDED",
        maxDurationSeconds: DEFAULT_MAX_DURATION_SECONDS,
      },
    }
  }

  const resolution = typeof payload.resolution === "string" ? parseResolution(payload.resolution) : null
  if (resolution && resolution.width * resolution.height > DEFAULT_MAX_RESOLUTION_PIXELS) {
    return {
      status: 400,
      payload: {
        error: "Requested resolution exceeds the maximum allowed size",
        code: "EDITOR_RENDER_MAX_RESOLUTION_EXCEEDED",
        maxResolutionPixels: DEFAULT_MAX_RESOLUTION_PIXELS,
      },
    }
  }

  const modelTier = inferModelTier(String(payload.modelId ?? ""))
  const maxModelTier = parseTier(process.env.EDITOR_RENDER_MAX_MODEL_TIER)
  if (modelTierOrder.indexOf(modelTier) > modelTierOrder.indexOf(maxModelTier)) {
    return {
      status: 403,
      payload: {
        error: "Requested model tier is not available",
        code: "EDITOR_RENDER_MODEL_TIER_FORBIDDEN",
        requestedTier: modelTier,
        allowedTier: maxModelTier,
      },
    }
  }

  return null
}

export async function GET(request: Request) {
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const historyMode = searchParams.get("history") === "1"
  const limitParam = Number(searchParams.get("limit") ?? 25)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 25
  const cursor = searchParams.get("cursor")

  const statusFilter =
    status && ["queued", "processing", "retrying", "completed", "failed", "canceled"].includes(status)
      ? status
      : null

  const jobs = await sql`
    SELECT *
    FROM editor_render_jobs
    WHERE owner_id=${auth.userId}
      AND (${projectId}::uuid IS NULL OR project_id=${projectId}::uuid)
      AND (${statusFilter}::text IS NULL OR status=${statusFilter}::text)
      AND (${cursor}::timestamptz IS NULL OR created_at < ${cursor}::timestamptz)
    ORDER BY created_at DESC
    LIMIT ${historyMode ? limit : Math.min(limit, 25)}
  `

  const nextCursor = jobs.length === (historyMode ? limit : Math.min(limit, 25)) ? jobs.at(-1)?.created_at ?? null : null

  return NextResponse.json({ jobs: jobs.map(mapRenderJobRow), nextCursor })
}

export async function POST(request: Request) {
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const parsedBody = editorRenderJobCreateRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      buildInvalidRequestError(parsedBody.error),
      { status: 400 },
    )
  }

  const parsedPayload = validateVideoGenerationPayload(parsedBody.data.payload ?? {})
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        code: "INVALID_REQUEST",
        details: { issues: formatZodIssues(parsedPayload.error) },
      },
      { status: 400 },
    )
  }

  const normalizedPayload = normalizeVideoGenerationPayload(parsedPayload.data)
  const effectivePayload = {
    ...buildGenerationDefaults(normalizedPayload.modelId),
    ...normalizedPayload,
  }

  const generationConfigErrors = validateGenerationConfig(effectivePayload.modelId, effectivePayload)
  if (Object.keys(generationConfigErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Invalid model configuration",
        code: "VIDEO_MODEL_VALIDATION_FAILED",
        issues: generationConfigErrors,
      },
      { status: 400 },
    )
  }

  const project = await getProjectById(auth.userId, parsedBody.data.projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const rateLimitError = await enforceRenderRateLimits(auth.userId, parsedBody.data.projectId)
  if (rateLimitError) {
    return NextResponse.json(rateLimitError.payload, { status: rateLimitError.status })
  }

  const quotaError = await enforceRenderQuotas(auth.userId, parsedBody.data.projectId)
  if (quotaError) {
    return NextResponse.json(quotaError.payload, { status: quotaError.status })
  }

  const timeline = project.timelines.find((entry) => entry.id === project.activeTimelineId) ?? project.timelines[0]
  if (!timeline) {
    return NextResponse.json({ error: "Project does not contain a timeline" }, { status: 400 })
  }

  let compilation
  try {
    compilation = compileTimelineToVideoGenerationRequest({
      timeline,
      assets: project.assets,
      payload: effectivePayload,
    })
  } catch (error) {
    if (error instanceof TimelineCompilationError) {
      return NextResponse.json(
        {
          error: "Unable to compile timeline",
          detail: error.message,
          code: error.code,
          issues: error.issues ?? [],
        },
        { status: 400 },
      )
    }

    throw error
  }

  const limitsError = enforceRenderInputLimits(compilation.request)
  if (limitsError) {
    return NextResponse.json(limitsError.payload, { status: limitsError.status })
  }

  let executionOutput = null
  try {
    executionOutput = await executeVideoModelById(compilation.request)
  } catch (error) {
    const mappedError = mapVideoModelExecutionError(error)
    return NextResponse.json({ error: mappedError.message, code: mappedError.code }, { status: 502 })
  }

  if (!executionOutput) {
    return NextResponse.json({ error: "Unsupported modelId", code: "VIDEO_MODEL_UNSUPPORTED" }, { status: 400 })
  }

  const maxAttempts = Number(process.env.EDITOR_RENDER_MAX_ATTEMPTS ?? 3)
  const [job] = await sql`
    INSERT INTO editor_render_jobs (
      project_id,
      owner_id,
      requested_by,
      status,
      payload,
      result,
      output_asset_id,
      attempt_count,
      max_attempts,
      cancellation_token,
      provider_trace
    )
    VALUES (
      ${parsedBody.data.projectId},
      ${auth.userId},
      ${auth.userId},
      'queued',
      ${JSON.stringify({
        provider: executionOutput.progress.provider,
        providerRequest: executionOutput.providerRequest,
        compiler: {
          summary: compilation.summary,
        },
      })}::jsonb,
      ${JSON.stringify({
        attemptCount: 0,
        startedAt: null,
        finishedAt: null,
        lastError: null,
        progress: executionOutput.progress.progressPercent,
        stage: executionOutput.progress.status,
        metadata: {
          provider: executionOutput.progress.provider,
          compiler: {
            summary: compilation.summary,
          },
          policy: {
            maxAttempts,
            providerTimeoutMs: Number(process.env.EDITOR_RENDER_PROVIDER_TIMEOUT_MS ?? 20000),
            providerRetries: Number(process.env.EDITOR_RENDER_PROVIDER_RETRIES ?? 2),
          },
        },
      })}::jsonb,
      null,
      0,
      ${maxAttempts},
      ${randomUUID()},
      ${JSON.stringify({ provider: executionOutput.progress.provider, model: effectivePayload.modelId })}::jsonb
    )
    RETURNING *
  `

  await sql`
    INSERT INTO editor_render_job_timeline (job_id, owner_id, from_status, to_status, event_type, event_payload)
    VALUES (${job.id}, ${auth.userId}, null, 'queued', 'job_created', ${JSON.stringify({ modelId: effectivePayload.modelId })}::jsonb)
  `

  publishRenderJobEvent({
    id: job.id,
    projectId: job.project_id,
    ownerId: job.owner_id,
    status: job.status,
    requestedBy: job.requested_by,
    payload: job.payload ?? {},
    result: job.result ?? {},
    outputAssetId: job.output_asset_id,
    attemptCount: Number(job.attempt_count ?? 0),
    maxAttempts: Number(job.max_attempts ?? 0),
    nextRetryAt: job.next_retry_at ?? null,
    cancellationToken: job.cancellation_token ?? null,
    canceledAt: job.canceled_at ?? null,
    lastErrorCode: job.last_error_code ?? null,
    providerTrace: job.provider_trace ?? {},
    providerOutput: job.provider_output ?? {},
    outputPublication: job.output_publication ?? {},
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  })

  return NextResponse.json({ job }, { status: 201 })
}
