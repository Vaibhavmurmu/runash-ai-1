import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { compileTimelineToVideoGenerationRequest, TimelineCompilationError } from "@/lib/editor/generation/compile-timeline"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { getProjectById, sql } from "@/lib/editor/repository"
import { buildGenerationDefaults, resolveVideoModelProviderAdapter } from "@/lib/editor/video-models/registry"
import { normalizeVideoGenerationPayload, validateVideoGenerationPayload } from "@/lib/editor/video-models/validation"

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = Number(process.env.EDITOR_RENDER_RATE_LIMIT_WINDOW_SECONDS ?? 300)
const DEFAULT_USER_RATE_LIMIT = Number(process.env.EDITOR_RENDER_RATE_LIMIT_USER ?? 20)
const DEFAULT_PROJECT_RATE_LIMIT = Number(process.env.EDITOR_RENDER_RATE_LIMIT_PROJECT ?? 8)
const DEFAULT_MAX_DURATION_SECONDS = Number(process.env.EDITOR_RENDER_MAX_DURATION_SECONDS ?? 120)
const DEFAULT_MAX_RESOLUTION_PIXELS = Number(process.env.EDITOR_RENDER_MAX_RESOLUTION_PIXELS ?? 3686400)

const modelTierOrder = ["standard", "pro", "enterprise"] as const
type ModelTier = (typeof modelTierOrder)[number]

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
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const jobs = projectId
    ? await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} AND project_id=${projectId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} ORDER BY created_at DESC LIMIT 25`

  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const body = await request.json()
  if (!body?.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const parsedPayload = validateVideoGenerationPayload(body.payload ?? {})
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        issues: parsedPayload.error.flatten(),
      },
      { status: 400 },
    )
  }

  const normalizedPayload = normalizeVideoGenerationPayload(parsedPayload.data)
  const effectivePayload = {
    ...buildGenerationDefaults(normalizedPayload.modelId),
    ...normalizedPayload,
  }
  const providerAdapter = resolveVideoModelProviderAdapter(effectivePayload.modelId)
  if (!providerAdapter) {
    return NextResponse.json(
      {
        error: `Unsupported modelId: ${effectivePayload.modelId}`,
      },
      { status: 400 },
    )
  }

  const project = await getProjectById(auth.userId, body.projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const rateLimitError = await enforceRenderRateLimits(auth.userId, body.projectId)
  if (rateLimitError) {
    return NextResponse.json(rateLimitError.payload, { status: rateLimitError.status })
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
        },
        { status: 400 },
      )
    }

    throw error
  }

  const providerPayload = providerAdapter.normalizeRequest(compilation.request)
  const limitsError = enforceRenderInputLimits(providerPayload)
  if (limitsError) {
    return NextResponse.json(limitsError.payload, { status: limitsError.status })
  }

  const [job] = await sql`
    INSERT INTO editor_render_jobs (project_id, owner_id, requested_by, status, payload, result, output_asset_id)
    VALUES (
      ${body.projectId},
      ${auth.userId},
      ${auth.userId},
      'queued',
      ${JSON.stringify(providerPayload)}::jsonb,
      ${JSON.stringify({
        attemptCount: 0,
        startedAt: null,
        finishedAt: null,
        lastError: null,
        progress: 0,
        stage: "queued",
        metadata: {
          compiler: compilation.summary,
        },
      })}::jsonb,
      null
    )
    RETURNING *
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
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  })

  return NextResponse.json({ job }, { status: 201 })
}
