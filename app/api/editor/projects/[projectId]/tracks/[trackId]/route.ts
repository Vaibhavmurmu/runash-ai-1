import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(_: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params

  const [track] = await sql`SELECT * FROM editor_tracks WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  return NextResponse.json({ track })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params
  const body = await request.json()

  const [track] = await sql`
    UPDATE editor_tracks
    SET label=COALESCE(${body.label ?? null}, label),
        order_index=COALESCE(${body.orderIndex ?? null}, order_index),
        track_type=COALESCE(${body.trackType ?? null}, track_type),
        metadata=COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata),
        updated_at=now()
    WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })
  await touchProject(projectId, auth.userId)
  return NextResponse.json({ track })
}

export async function DELETE(_: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params

  const rows = await sql`DELETE FROM editor_tracks WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!rows.length) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ deleted: true, trackId })
}
