import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"
import { claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { publishTimelineLockChanged } from "@/services/realtime/publishers"

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const body = (await request.json().catch(() => ({}))) as { timelineId?: string; lock?: boolean; version?: number | string }
  if (!body.timelineId) {
    return NextResponse.json({ error: "timelineId is required" }, { status: 400 })
  }

  const version = parseExpectedVersion(request, body as Record<string, unknown>)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId: params.projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: body.lock === false ? "timeline.unlock" : "timeline.lock",
    targetType: "timeline",
    targetId: body.timelineId,
  })
  if (!claim.ok) return claim.response

  const [row] = await sql<{ metadata: Record<string, unknown> | null }>`
    SELECT metadata
    FROM editor_timelines
    WHERE id=${body.timelineId} AND project_id=${params.projectId} AND owner_id=${auth.userId}
    LIMIT 1
  `

  if (!row) {
    return NextResponse.json({ error: "Timeline not found" }, { status: 404 })
  }

  const metadata = row.metadata && typeof row.metadata === "object" ? { ...row.metadata } : {}
  const currentRevision = typeof metadata.lockRevision === "number" ? metadata.lockRevision : 0
  const nextRevision = currentRevision + 1

  const lockOwnerUserId = body.lock === false ? null : auth.userId
  metadata.lockOwnerUserId = lockOwnerUserId
  metadata.lockRevision = nextRevision

  await sql`
    UPDATE editor_timelines
    SET metadata=${JSON.stringify(metadata)}::jsonb, updated_at=now()
    WHERE id=${body.timelineId} AND project_id=${params.projectId} AND owner_id=${auth.userId}
  `

  await touchProject(params.projectId, auth.userId)

  publishTimelineLockChanged({
    projectId: params.projectId,
    timelineId: body.timelineId,
    lockOwnerUserId,
    revision: nextRevision,
  })

  return NextResponse.json({ timelineId: body.timelineId, lockOwnerUserId, revision: nextRevision, version: claim.projectVersion })
}
