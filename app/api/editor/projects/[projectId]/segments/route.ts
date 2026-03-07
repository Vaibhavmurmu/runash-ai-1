import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { buildInvalidRequestError, editorSegmentCreateRequestSchema } from "@/lib/api/contracts"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const { searchParams } = new URL(request.url)
  const timelineId = searchParams.get("timelineId")

  const segments = timelineId
    ? await sql`SELECT * FROM editor_segments WHERE project_id=${projectId} AND timeline_id=${timelineId} AND owner_id=${auth.userId} ORDER BY start_seconds, created_at`
    : await sql`SELECT * FROM editor_segments WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY start_seconds, created_at`

  return NextResponse.json({ segments })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json().catch(() => ({}))

  const parsedBody = editorSegmentCreateRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const version = parseExpectedVersion(request, parsedBody.data)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "segment.create",
    targetType: "segment",
  })
  if (!claim.ok) return claim.response

  const [segment] = await sql`
    INSERT INTO editor_segments (timeline_id, project_id, owner_id, track_id, asset_id, label, segment_type, start_seconds, end_seconds, metadata)
    VALUES (
      ${parsedBody.data.timelineId},
      ${projectId},
      ${auth.userId},
      ${parsedBody.data.trackId},
      ${parsedBody.data.assetId ?? null},
      ${parsedBody.data.label || "Segment"},
      ${parsedBody.data.segmentType || "clip"},
      ${parsedBody.data.startSeconds || 0},
      ${parsedBody.data.endSeconds || 1},
      ${JSON.stringify(parsedBody.data.metadata || {})}::jsonb
    )
    RETURNING *
  `

  await bumpTimelineVersion(parsedBody.data.timelineId, projectId, auth.userId)
  return NextResponse.json({ segment, version: claim.projectVersion }, { status: 201 })
}
