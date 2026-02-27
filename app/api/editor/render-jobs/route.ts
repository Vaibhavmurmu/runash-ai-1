import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { compileTimelineToVideoGenerationRequest, TimelineCompilationError } from "@/lib/editor/generation/compile-timeline"
import { getProjectById, sql } from "@/lib/editor/repository"
import { resolveVideoModelProviderAdapter } from "@/lib/editor/video-models/registry"
import { normalizeVideoGenerationPayload, validateVideoGenerationPayload } from "@/lib/editor/video-models/validation"

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
  const providerAdapter = resolveVideoModelProviderAdapter(normalizedPayload.modelId)
  if (!providerAdapter) {
    return NextResponse.json(
      {
        error: `Unsupported modelId: ${normalizedPayload.modelId}`,
      },
      { status: 400 },
    )
  }

  const project = await getProjectById(auth.userId, body.projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
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
      payload: normalizedPayload,
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

  return NextResponse.json({ job }, { status: 201 })
}
