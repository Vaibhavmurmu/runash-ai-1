import { neon } from "@neondatabase/serverless"
import type { EditorAsset, EditorProject, EditorRenderJob, EditorSegment, EditorTimeline, EditorTrack } from "@/lib/editor/domain"

const sql = neon(process.env.DATABASE_URL!)

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {})

function mapTrack(row: Record<string, any>): EditorTrack {
  return {
    id: row.id,
    timelineId: row.timeline_id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    label: row.label,
    orderIndex: row.order_index,
    trackType: row.track_type,
    metadata: asRecord(row.metadata),
    lockOwnerUserId: row.lock_owner_user_id ?? null,
    lockExpiresAt: row.lock_expires_at ?? null,
    lockAcquiredAt: row.lock_acquired_at ?? null,
    lockUpdatedAt: row.lock_updated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSegment(row: Record<string, any>): EditorSegment {
  return {
    id: row.id,
    projectId: row.project_id,
    timelineId: row.timeline_id,
    ownerId: row.owner_id,
    trackId: row.track_id,
    assetId: row.asset_id,
    label: row.label,
    segmentType: row.segment_type,
    startSeconds: Number(row.start_seconds),
    endSeconds: Number(row.end_seconds),
    metadata: asRecord(row.metadata),
    lockOwnerUserId: row.lock_owner_user_id ?? null,
    lockExpiresAt: row.lock_expires_at ?? null,
    lockAcquiredAt: row.lock_acquired_at ?? null,
    lockUpdatedAt: row.lock_updated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAsset(row: Record<string, any>): EditorAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    source: row.source,
    uploadFileId: row.upload_file_id,
    storageKey: row.storage_key,
    accessUrl: row.access_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    metadata: asRecord(row.metadata),
    lockOwnerUserId: row.lock_owner_user_id ?? null,
    lockExpiresAt: row.lock_expires_at ?? null,
    lockAcquiredAt: row.lock_acquired_at ?? null,
    lockUpdatedAt: row.lock_updated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRenderJob(row: Record<string, any>): EditorRenderJob {
  return {
    id: row.id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    status: row.status,
    requestedBy: row.requested_by,
    payload: asRecord(row.payload),
    result: asRecord(row.result),
    outputAssetId: row.output_asset_id,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    nextRetryAt: row.next_retry_at ?? null,
    cancellationToken: row.cancellation_token ?? null,
    canceledAt: row.canceled_at ?? null,
    lastErrorCode: row.last_error_code ?? null,
    providerTrace: asRecord(row.provider_trace),
    providerOutput: asRecord(row.provider_output),
    outputPublication: asRecord(row.output_publication),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProjectById(ownerId: string, projectId: string): Promise<EditorProject | null> {
  const [project] = await sql`SELECT * FROM editor_projects WHERE id=${projectId} AND owner_id=${ownerId}`
  if (!project) return null

  const timelinesRows = await sql`SELECT * FROM editor_timelines WHERE project_id=${projectId} AND owner_id=${ownerId} ORDER BY created_at`
  const trackRows = await sql`SELECT * FROM editor_tracks WHERE project_id=${projectId} AND owner_id=${ownerId} ORDER BY order_index, created_at`
  const segmentRows = await sql`SELECT * FROM editor_segments WHERE project_id=${projectId} AND owner_id=${ownerId} ORDER BY start_seconds, created_at`
  const assetsRows = await sql`SELECT * FROM editor_assets WHERE project_id=${projectId} AND owner_id=${ownerId} ORDER BY created_at DESC`
  const renderRows = await sql`SELECT * FROM editor_render_jobs WHERE project_id=${projectId} AND owner_id=${ownerId} ORDER BY created_at DESC`

  const tracksByTimeline = new Map<string, EditorTrack[]>()
  for (const row of trackRows) {
    const track = mapTrack(row)
    tracksByTimeline.set(track.timelineId, [...(tracksByTimeline.get(track.timelineId) || []), track])
  }

  const segmentsByTimeline = new Map<string, EditorSegment[]>()
  for (const row of segmentRows) {
    const segment = mapSegment(row)
    segmentsByTimeline.set(segment.timelineId, [...(segmentsByTimeline.get(segment.timelineId) || []), segment])
  }

  const timelines: EditorTimeline[] = timelinesRows.map((row: Record<string, any>) => ({
    id: row.id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    name: row.name,
    frameRate: Number(row.frame_rate),
    durationSeconds: Number(row.duration_seconds),
    metadata: asRecord(row.metadata),
    tracks: tracksByTimeline.get(row.id) || [],
    segments: segmentsByTimeline.get(row.id) || [],
    version: Number(row.version ?? 0),
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return {
    id: project.id,
    ownerId: project.owner_id,
    name: project.name,
    status: project.status,
    metadata: asRecord(project.metadata),
    activeTimelineId: project.active_timeline_id,
    timelines,
    assets: assetsRows.map(mapAsset),
    renderJobs: renderRows.map(mapRenderJob),
    version: Number(project.version ?? 0),
    updatedBy: project.updated_by ?? null,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }
}

export async function touchProject(projectId: string, ownerId: string) {
  await sql`UPDATE editor_projects SET updated_at = now() WHERE id=${projectId} AND owner_id=${ownerId}`
}

export { sql }
