import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { requireEditingEnabled } from "@/app/api/editor/projects/_permissions"
import { buildInvalidRequestError } from "@/lib/api/contracts"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { sql } from "@/lib/editor/repository"
import { ensureSegmentEditable } from "@/lib/editor/segment-locks"

const updateEditorSegmentSchema = z.object({
  trackId: z.string().trim().min(1).max(120).optional(),
  assetId: z.string().trim().min(1).max(120).nullable().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  segmentType: z.string().trim().min(1).max(64).optional(),
  startSeconds: z.number().nonnegative().optional(),
  endSeconds: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
})

export async function GET(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string; segmentId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params

  const [segment] = await sql`SELECT * FROM editor_segments WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  return NextResponse.json({ segment })
}

export async function PATCH(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string; segmentId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const body = await request.json().catch(() => ({}))

  const parsedBody = updateEditorSegmentSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const lockGuard = await ensureSegmentEditable({ projectId, segmentId, userId: auth.userId })
  if (lockGuard) return lockGuard

  const version = parseExpectedVersion(request, parsedBody.data)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "segment.update",
    targetType: "segment",
    targetId: segmentId,
  })
  if (!claim.ok) return claim.response

  const [segment] = await sql`
    UPDATE editor_segments
    SET
      track_id=COALESCE(${parsedBody.data.trackId ?? null}, track_id),
      asset_id=COALESCE(${parsedBody.data.assetId ?? null}, asset_id),
      label=COALESCE(${parsedBody.data.label ?? null}, label),
      segment_type=COALESCE(${parsedBody.data.segmentType ?? null}, segment_type),
      start_seconds=COALESCE(${parsedBody.data.startSeconds ?? null}, start_seconds),
      end_seconds=COALESCE(${parsedBody.data.endSeconds ?? null}, end_seconds),
      metadata=COALESCE(${parsedBody.data.metadata ? JSON.stringify(parsedBody.data.metadata) : null}::jsonb, metadata),
      updated_at=now()
    WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 })
  await bumpTimelineVersion(segment.timeline_id, projectId, auth.userId)
  return NextResponse.json({ segment, version: claim.projectVersion })
}

export async function DELETE(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string; segmentId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId, segmentId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const { searchParams } = new URL(request.url)

  const lockGuard = await ensureSegmentEditable({ projectId, segmentId, userId: auth.userId })
  if (lockGuard) return lockGuard

  const version = parseExpectedVersion(request, { version: searchParams.get("version") })
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "segment.delete",
    targetType: "segment",
    targetId: segmentId,
  })
  if (!claim.ok) return claim.response

  const rows = await sql`DELETE FROM editor_segments WHERE id=${segmentId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id, timeline_id`
  if (!rows.length) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  await bumpTimelineVersion(rows[0].timeline_id, projectId, auth.userId)
  return NextResponse.json({ deleted: true, segmentId, version: claim.projectVersion })
}
