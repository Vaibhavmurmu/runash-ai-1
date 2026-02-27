import { one, sql } from "@/lib/db"

type SnapshotRow = {
  id: string
  stream_id: string | null
  title: string | null
  completed_at: string | null
  last_stream_config: Record<string, unknown>
  scene_layout: Record<string, unknown>
  key_metrics: Record<string, unknown>
  unresolved_alerts: Array<Record<string, unknown>>
}

export interface LatestCompletedStreamSummary {
  snapshotId: string
  streamId: string | null
  title: string
  completedAt: string
  keyMetrics: Record<string, unknown>
  unresolvedAlerts: Array<Record<string, unknown>>
}

export interface RestorableStreamDraft {
  snapshotId: string
  streamId: string | null
  title: string
  lastStreamConfig: Record<string, unknown>
  sceneLayout: Record<string, unknown>
  keyMetrics: Record<string, unknown>
  unresolvedAlerts: Array<Record<string, unknown>>
}

export interface FollowUpCreationResult {
  snapshotId: string
  streamId: string | null
  followUpTaskId: string
  highlightJobId: string
}

async function getLatestSnapshotRow(userId: string): Promise<SnapshotRow | null> {
  return one<SnapshotRow>(sql<SnapshotRow[]>`
    select
      sss.id,
      sss.stream_id,
      coalesce(str.title, 'Previous live session') as title,
      sss.completed_at,
      sss.last_stream_config,
      sss.scene_layout,
      sss.key_metrics,
      sss.unresolved_alerts
    from stream_session_snapshots sss
    left join streams str on str.id = sss.stream_id
    where sss.user_id = ${userId}
      and sss.snapshot_status = 'completed'
    order by coalesce(sss.completed_at, sss.created_at) desc
    limit 1
  `)
}

export async function fetchLatestCompletedStreamSummary(userId: string): Promise<LatestCompletedStreamSummary | null> {
  const snapshot = await getLatestSnapshotRow(userId)
  if (!snapshot) return null

  return {
    snapshotId: snapshot.id,
    streamId: snapshot.stream_id,
    title: snapshot.title ?? "Previous live session",
    completedAt: snapshot.completed_at ?? new Date().toISOString(),
    keyMetrics: snapshot.key_metrics ?? {},
    unresolvedAlerts: Array.isArray(snapshot.unresolved_alerts) ? snapshot.unresolved_alerts : [],
  }
}

export async function fetchRestorableStreamDraft(userId: string): Promise<RestorableStreamDraft | null> {
  const snapshot = await getLatestSnapshotRow(userId)
  if (!snapshot) return null

  return {
    snapshotId: snapshot.id,
    streamId: snapshot.stream_id,
    title: snapshot.title ?? "Previous live session",
    lastStreamConfig: snapshot.last_stream_config ?? {},
    sceneLayout: snapshot.scene_layout ?? {},
    keyMetrics: snapshot.key_metrics ?? {},
    unresolvedAlerts: Array.isArray(snapshot.unresolved_alerts) ? snapshot.unresolved_alerts : [],
  }
}

export async function createFollowUpFromLatestSnapshot(userId: string): Promise<FollowUpCreationResult | null> {
  const snapshot = await getLatestSnapshotRow(userId)
  if (!snapshot) return null

  const [task] = await sql<{ id: string }[]>`
    insert into stream_follow_up_tasks (user_id, stream_id, source_snapshot_id, title, metadata)
    values (
      ${userId},
      ${snapshot.stream_id},
      ${snapshot.id},
      ${`Follow-up from ${snapshot.title ?? "previous live session"}`},
      ${JSON.stringify({ keyMetrics: snapshot.key_metrics ?? {}, unresolvedAlerts: snapshot.unresolved_alerts ?? [] })}
    )
    returning id
  `

  const [highlightJob] = await sql<{ id: string }[]>`
    insert into stream_highlight_jobs (user_id, stream_id, source_snapshot_id, metadata)
    values (
      ${userId},
      ${snapshot.stream_id},
      ${snapshot.id},
      ${JSON.stringify({ requestedFrom: "streaming-studio-quick-actions", snapshotCompletedAt: snapshot.completed_at })}
    )
    returning id
  `

  return {
    snapshotId: snapshot.id,
    streamId: snapshot.stream_id,
    followUpTaskId: task.id,
    highlightJobId: highlightJob.id,
  }
}
