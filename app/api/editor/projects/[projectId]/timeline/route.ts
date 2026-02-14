import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { getProjectById, sql, touchProject } from "@/lib/editor/repository"

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params

  const project = await getProjectById(auth.userId, projectId)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  return NextResponse.json({ timelines: project.timelines, activeTimelineId: project.activeTimelineId })
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json()

  const timeline = body.timeline
  if (!timeline?.id) {
    return NextResponse.json({ error: "timeline.id is required" }, { status: 400 })
  }

  await sql`
    UPDATE editor_timelines
    SET
      name=COALESCE(${timeline.name ?? null}, name),
      frame_rate=COALESCE(${timeline.frameRate ?? null}, frame_rate),
      duration_seconds=COALESCE(${timeline.durationSeconds ?? null}, duration_seconds),
      metadata=COALESCE(${timeline.metadata ? JSON.stringify(timeline.metadata) : null}::jsonb, metadata),
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

  await sql`UPDATE editor_projects SET active_timeline_id=${timeline.id}, updated_at=now() WHERE id=${projectId} AND owner_id=${auth.userId}`
  await touchProject(projectId, auth.userId)

  const project = await getProjectById(auth.userId, projectId)
  return NextResponse.json({ project })
}
