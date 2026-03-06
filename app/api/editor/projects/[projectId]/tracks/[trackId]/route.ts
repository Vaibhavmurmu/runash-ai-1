import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params

  const [track] = await sql`SELECT * FROM editor_tracks WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  return NextResponse.json({ track })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params
  const body = await request.json()

  const version = parseExpectedVersion(request, body)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "track.update",
    targetType: "track",
    targetId: trackId,
  })
  if (!claim.ok) return claim.response

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
  await bumpTimelineVersion(track.timeline_id, projectId, auth.userId)
  return NextResponse.json({ track, version: claim.projectVersion })
}

export async function DELETE(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params
  const { searchParams } = new URL(request.url)

  const version = parseExpectedVersion(request, { version: searchParams.get("version") })
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "track.delete",
    targetType: "track",
    targetId: trackId,
  })
  if (!claim.ok) return claim.response

  const rows = await sql`DELETE FROM editor_tracks WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id, timeline_id`
  if (!rows.length) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  await bumpTimelineVersion(rows[0].timeline_id, projectId, auth.userId)
  return NextResponse.json({ deleted: true, trackId, version: claim.projectVersion })
}
