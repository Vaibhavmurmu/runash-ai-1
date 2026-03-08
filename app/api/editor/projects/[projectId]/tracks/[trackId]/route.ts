import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { requireEditingEnabled } from "@/app/api/editor/projects/_permissions"
import { buildInvalidRequestError } from "@/lib/api/contracts"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { sql } from "@/lib/editor/repository"

const updateEditorTrackSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  trackType: z.string().trim().min(1).max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
})

export async function GET(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params

  const [track] = await sql`SELECT * FROM editor_tracks WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })

  return NextResponse.json({ track })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const body = await request.json().catch(() => ({}))

  const parsedBody = updateEditorTrackSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const version = parseExpectedVersion(request, parsedBody.data)
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
    SET label=COALESCE(${parsedBody.data.label ?? null}, label),
        order_index=COALESCE(${parsedBody.data.orderIndex ?? null}, order_index),
        track_type=COALESCE(${parsedBody.data.trackType ?? null}, track_type),
        metadata=COALESCE(${parsedBody.data.metadata ? JSON.stringify(parsedBody.data.metadata) : null}::jsonb, metadata),
        updated_at=now()
    WHERE id=${trackId} AND project_id=${projectId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 })
  await bumpTimelineVersion(track.timeline_id, projectId, auth.userId)
  return NextResponse.json({ track, version: claim.projectVersion })
}

export async function DELETE(request: Request, { params }: { params: { projectId: string; trackId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, trackId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
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
