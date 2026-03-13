import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { requireEditingEnabled } from "@/app/api/editor/projects/_permissions"
import {
  editorProjectTimelineCreateRequestSchema,
  editorProjectTimelineReplaceRequestSchema,
  formatZodIssues,
} from "@/lib/api/contracts"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { getProjectById, sql } from "@/lib/editor/repository"
import { publishTimelineMutated } from "@/services/realtime/publishers"

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params

  const project = await getProjectById(auth.userId, projectId)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  return NextResponse.json({ timelines: project.timelines, activeTimelineId: project.activeTimelineId, version: project.version })
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const body = await request.json().catch(() => ({}))
  const parsedBody = editorProjectTimelineCreateRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_REQUEST", details: { issues: formatZodIssues(parsedBody.error) } },
      { status: 400 },
    )
  }

  const version = parseExpectedVersion(request, parsedBody.data)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "timeline.create",
    targetType: "timeline",
  })
  if (!claim.ok) return claim.response

  const [timeline] = await sql`
    INSERT INTO editor_timelines (project_id, owner_id, name, frame_rate, duration_seconds, metadata, updated_by)
    VALUES (${projectId}, ${auth.userId}, ${parsedBody.data.name || "Timeline"}, ${parsedBody.data.frameRate ?? 30}, ${parsedBody.data.durationSeconds ?? 10}, ${JSON.stringify(parsedBody.data.metadata || {})}::jsonb, ${auth.userId})
    RETURNING *
  `

  await sql`
    UPDATE editor_projects
    SET active_timeline_id=COALESCE(${parsedBody.data.activate === false ? null : timeline.id}, active_timeline_id)
    WHERE id=${projectId} AND owner_id=${auth.userId}
  `

  publishTimelineMutated({ projectId, timelineId: timeline.id, mutation: "created", actorUserId: auth.userId })
  return NextResponse.json({ timeline, version: claim.projectVersion }, { status: 201 })
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const body = await request.json().catch(() => ({}))
  const parsedBody = editorProjectTimelineReplaceRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_REQUEST", details: { issues: formatZodIssues(parsedBody.error) } },
      { status: 400 },
    )
  }

  const timeline = parsedBody.data.timeline

  const version = parseExpectedVersion(request, parsedBody.data)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "timeline.replace",
    targetType: "timeline",
    targetId: timeline.id,
  })
  if (!claim.ok) return claim.response

  await sql`
    UPDATE editor_timelines
    SET
      name=COALESCE(${timeline.name ?? null}, name),
      frame_rate=COALESCE(${timeline.frameRate ?? null}, frame_rate),
      duration_seconds=COALESCE(${timeline.durationSeconds ?? null}, duration_seconds),
      metadata=COALESCE(${timeline.metadata ? JSON.stringify(timeline.metadata) : null}::jsonb, metadata),
      updated_by=${auth.userId},
      updated_at=now()
    WHERE id=${timeline.id} AND project_id=${projectId} AND owner_id=${auth.userId}
  `

  await sql`DELETE FROM editor_tracks WHERE timeline_id=${timeline.id} AND project_id=${projectId} AND owner_id=${auth.userId}`
  for (const track of timeline.tracks || []) {
    await sql`
      INSERT INTO editor_tracks (id, timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
      VALUES (${track.id}, ${timeline.id}, ${projectId}, ${auth.userId}, ${track.label || "Track"}, ${track.orderIndex ?? 0}, ${track.trackType || "video"}, ${JSON.stringify(track.metadata || {})}::jsonb)
    `
  }

  await sql`DELETE FROM editor_segments WHERE timeline_id=${timeline.id} AND project_id=${projectId} AND owner_id=${auth.userId}`
  for (const segment of timeline.segments || []) {
    await sql`
      INSERT INTO editor_segments (id, project_id, timeline_id, owner_id, track_id, asset_id, label, segment_type, start_seconds, end_seconds, metadata)
      VALUES (${segment.id}, ${projectId}, ${timeline.id}, ${auth.userId}, ${segment.trackId}, ${segment.assetId ?? null}, ${segment.label || "Segment"}, ${segment.segmentType || "clip"}, ${segment.startSeconds ?? 0}, ${segment.endSeconds ?? 0}, ${JSON.stringify(segment.metadata || {})}::jsonb)
    `
  }

  await bumpTimelineVersion(timeline.id, projectId, auth.userId)
  await sql`UPDATE editor_projects SET active_timeline_id=${timeline.id} WHERE id=${projectId} AND owner_id=${auth.userId}`
  publishTimelineMutated({ projectId, timelineId: timeline.id, mutation: "updated", actorUserId: auth.userId })

  const project = await getProjectById(auth.userId, projectId)
  return NextResponse.json({ project, version: claim.projectVersion })
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const { searchParams } = new URL(request.url)
  const timelineId = searchParams.get("timelineId")

  if (!timelineId) return NextResponse.json({ error: "timelineId is required", code: "INVALID_REQUEST" }, { status: 400 })

  const version = parseExpectedVersion(request, { version: searchParams.get("version") })
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "timeline.delete",
    targetType: "timeline",
    targetId: timelineId,
  })
  if (!claim.ok) return claim.response

  const rows = await sql`DELETE FROM editor_timelines WHERE id=${timelineId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!rows.length) return NextResponse.json({ error: "Timeline not found", code: "NOT_FOUND" }, { status: 404 })

  await sql`
    UPDATE editor_projects
    SET active_timeline_id=(SELECT id FROM editor_timelines WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY created_at LIMIT 1)
    WHERE id=${projectId} AND owner_id=${auth.userId}
  `

  publishTimelineMutated({ projectId, timelineId, mutation: "deleted", actorUserId: auth.userId })
  return NextResponse.json({ deleted: true, timelineId, version: claim.projectVersion })
}
