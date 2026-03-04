import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string; segmentId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params

  const [segment] = await sql`SELECT * FROM editor_segments WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  return NextResponse.json({ segment })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; segmentId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params
  const body = await request.json()

  const [segment] = await sql`
    UPDATE editor_segments
    SET
      track_id=COALESCE(${body.trackId ?? null}, track_id),
      asset_id=COALESCE(${body.assetId ?? null}, asset_id),
      label=COALESCE(${body.label ?? null}, label),
      segment_type=COALESCE(${body.segmentType ?? null}, segment_type),
      start_seconds=COALESCE(${body.startSeconds ?? null}, start_seconds),
      end_seconds=COALESCE(${body.endSeconds ?? null}, end_seconds),
      metadata=COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata),
      updated_at=now()
    WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 })
  await touchProject(projectId, auth.userId)
  return NextResponse.json({ segment })
}

export async function DELETE(request: Request, { params }: { params: { projectId: string; segmentId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params

  const rows = await sql`DELETE FROM editor_segments WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!rows.length) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ deleted: true, segmentId })
}
