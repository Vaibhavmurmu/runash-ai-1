import { realtimeGateway } from "@/services/realtime/gateway"

export function publishRenderJobUpdated(input: {
  projectId: string
  jobId: string
  status: string
  progress: number | null
  stage: string | null
  updatedAt: string
}) {
  realtimeGateway.publish({
    channel: `editor:${input.projectId}`,
    type: "render_job.updated",
    payload: input,
  })
}

export function publishTimelineMutated(input: {
  projectId: string
  timelineId: string
  mutation: "created" | "updated" | "deleted"
  actorUserId: string
  occurredAt?: string
}) {
  realtimeGateway.publish({
    channel: `editor:${input.projectId}`,
    type: "timeline.mutated",
    payload: {
      projectId: input.projectId,
      timelineId: input.timelineId,
      mutation: input.mutation,
      actorUserId: input.actorUserId,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    },
  })
}

export function publishTimelineLockChanged(input: {
  projectId: string
  timelineId: string
  lockOwnerUserId: string | null
  revision: number
  occurredAt?: string
}) {
  realtimeGateway.publish({
    channel: `editor:${input.projectId}`,
    type: "timeline.lock_changed",
    payload: {
      projectId: input.projectId,
      timelineId: input.timelineId,
      lockOwnerUserId: input.lockOwnerUserId,
      revision: input.revision,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    },
  })
}

export function publishSessionStateChanged(input: {
  sessionId: string
  previousStatus: string | null
  status: string
  occurredAt: string
  actorUserId: number | null
  reason?: string | null
}) {
  realtimeGateway.publish({
    channel: `stream:${input.sessionId}`,
    type: "session.state_changed",
    payload: input,
  })
}

export function publishCollaboratorPresence(input: { projectId: string; userId: string; state: "join" | "leave" }) {
  realtimeGateway.publish({
    channel: `editor:${input.projectId}`,
    type: "collaborator.presence",
    payload: {
      projectId: input.projectId,
      userId: input.userId,
      state: input.state,
      occurredAt: new Date().toISOString(),
    },
  })
}
