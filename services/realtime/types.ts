export type RealtimeChannel = `stream:${string}` | `editor:${string}`

export type RealtimeEventType =
  | "session.state_changed"
  | "render_job.updated"
  | "timeline.mutated"
  | "timeline.lock_changed"
  | "collaborator.presence"

export type RealtimeEventPayloadMap = {
  "session.state_changed": {
    sessionId: string
    previousStatus: string | null
    status: string
    occurredAt: string
    actorUserId: number | null
    reason?: string | null
  }
  "render_job.updated": {
    projectId: string
    jobId: string
    status: string
    progress: number | null
    stage: string | null
    updatedAt: string
  }
  "timeline.mutated": {
    projectId: string
    timelineId: string
    mutation: "created" | "updated" | "deleted"
    actorUserId: string
    occurredAt: string
  }
  "timeline.lock_changed": {
    projectId: string
    timelineId: string
    lockOwnerUserId: string | null
    revision: number
    occurredAt: string
  }
  "collaborator.presence": {
    projectId: string
    userId: string
    state: "join" | "leave"
    occurredAt: string
  }
}

export type RealtimeEvent<T extends RealtimeEventType = RealtimeEventType> = {
  schemaVersion: "1.0"
  cursor: string
  channel: RealtimeChannel
  type: T
  sentAt: string
  payload: RealtimeEventPayloadMap[T]
}
