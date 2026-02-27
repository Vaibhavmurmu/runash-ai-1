import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser(request)
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
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json()

  const [segment] = await sql`
    INSERT INTO editor_segments (timeline_id, project_id, owner_id, track_id, asset_id, label, segment_type, start_seconds, end_seconds, metadata)
    VALUES (
      ${body.timelineId},
      ${projectId},
      ${auth.userId},
      ${body.trackId},
      ${body.assetId ?? null},
      ${body.label || "Segment"},
      ${body.segmentType || "clip"},
      ${body.startSeconds || 0},
      ${body.endSeconds || 1},
      ${JSON.stringify(body.metadata || {})}::jsonb
    )
    RETURNING *
  `

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ segment }, { status: 201 })
}
