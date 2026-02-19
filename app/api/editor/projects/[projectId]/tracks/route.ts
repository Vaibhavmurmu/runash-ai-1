import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params
  const { searchParams } = new URL(request.url)
  const timelineId = searchParams.get("timelineId")

  const tracks = timelineId
    ? await sql`SELECT * FROM editor_tracks WHERE project_id=${projectId} AND timeline_id=${timelineId} AND owner_id=${auth.userId} ORDER BY order_index, created_at`
    : await sql`SELECT * FROM editor_tracks WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY order_index, created_at`

  return NextResponse.json({ tracks })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json()

  const [track] = await sql`
    INSERT INTO editor_tracks (timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
    VALUES (${body.timelineId}, ${projectId}, ${auth.userId}, ${body.label || "Track"}, ${body.orderIndex || 0}, ${body.trackType || "video"}, ${JSON.stringify(body.metadata || {})}::jsonb)
    RETURNING *
  `

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ track }, { status: 201 })
}
