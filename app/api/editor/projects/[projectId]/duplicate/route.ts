import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { getProjectById, sql } from "@/lib/editor/repository"
import { claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"

export async function POST(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json().catch(() => ({}))
  const version = parseExpectedVersion(request, body)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "project.duplicate",
    targetType: "project",
    targetId: projectId,
  })
  if (!claim.ok) return claim.response

  const source = await getProjectById(auth.userId, projectId)
  if (!source) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [project] = await sql`
    INSERT INTO editor_projects (owner_id, name, status, metadata)
    VALUES (${auth.userId}, ${body.name || `${source.name} (Copy)`}, ${source.status}, ${JSON.stringify(source.metadata)}::jsonb)
    RETURNING *
  `

  const timelineIdMap = new Map<string, string>()
  for (const timeline of source.timelines) {
    const [newTimeline] = await sql`
      INSERT INTO editor_timelines (project_id, owner_id, name, frame_rate, duration_seconds, metadata)
      VALUES (${project.id}, ${auth.userId}, ${timeline.name}, ${timeline.frameRate}, ${timeline.durationSeconds}, ${JSON.stringify(timeline.metadata)}::jsonb)
      RETURNING *
    `
    timelineIdMap.set(timeline.id, newTimeline.id)
  }

  const assetIdMap = new Map<string, string>()
  for (const asset of source.assets) {
    const [newAsset] = await sql`
      INSERT INTO editor_assets (project_id, owner_id, source, upload_file_id, storage_key, access_url, mime_type, size_bytes, metadata)
      VALUES (${project.id}, ${auth.userId}, ${asset.source}, ${asset.uploadFileId}, ${asset.storageKey}, ${asset.accessUrl}, ${asset.mimeType}, ${asset.sizeBytes}, ${JSON.stringify(asset.metadata)}::jsonb)
      RETURNING id
    `
    assetIdMap.set(asset.id, newAsset.id)
  }

  for (const timeline of source.timelines) {
    const newTimelineId = timelineIdMap.get(timeline.id)
    if (!newTimelineId) continue

    const trackIdMap = new Map<string, string>()
    for (const track of timeline.tracks) {
      const [newTrack] = await sql`
        INSERT INTO editor_tracks (timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
        VALUES (${newTimelineId}, ${project.id}, ${auth.userId}, ${track.label}, ${track.orderIndex}, ${track.trackType}, ${JSON.stringify(track.metadata)}::jsonb)
        RETURNING id
      `
      trackIdMap.set(track.id, newTrack.id)
    }

    for (const segment of timeline.segments) {
      const newTrackId = trackIdMap.get(segment.trackId)
      if (!newTrackId) continue

      await sql`
        INSERT INTO editor_segments (project_id, timeline_id, owner_id, track_id, asset_id, label, segment_type, start_seconds, end_seconds, metadata)
        VALUES (
          ${project.id},
          ${newTimelineId},
          ${auth.userId},
          ${newTrackId},
          ${segment.assetId ? assetIdMap.get(segment.assetId) || null : null},
          ${segment.label},
          ${segment.segmentType},
          ${segment.startSeconds},
          ${segment.endSeconds},
          ${JSON.stringify(segment.metadata)}::jsonb
        )
      `
    }
  }

  const newActiveTimelineId = source.activeTimelineId ? timelineIdMap.get(source.activeTimelineId) ?? null : null
  await sql`UPDATE editor_projects SET active_timeline_id=${newActiveTimelineId}, updated_at=now() WHERE id=${project.id} AND owner_id=${auth.userId}`

  const duplicated = await getProjectById(auth.userId, project.id)
  return NextResponse.json({ project: duplicated, sourceVersion: claim.projectVersion }, { status: 201 })
}
