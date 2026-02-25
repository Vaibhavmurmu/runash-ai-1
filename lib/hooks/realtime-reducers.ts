import type { RealtimeEventEnvelope } from "@/lib/hooks/use-realtime-client"

export type StreamRealtimeItem = {
  id: string
  status: string
  title?: string
  viewerCount?: number
  updatedAt?: string
}

export type AlertRealtimeItem = {
  id: string
  severity: "info" | "warning" | "critical"
  message: string
  createdAt: string
  module?: string
}

export type ChatRealtimeMessage = {
  id: string
  streamId: string
  userId?: string | null
  username?: string
  message: string
  createdAt: string
}

export type AutomationRealtimeJob = {
  id: string
  flowId?: string
  status: "queued" | "running" | "completed" | "failed" | string
  progress?: number
  updatedAt?: string
}

export type EditorRealtimeJob = {
  id: string
  documentId?: string
  status: "queued" | "running" | "completed" | "failed" | string
  progress?: number
  updatedAt?: string
}

export type StreamsRealtimeState = {
  byId: Record<string, StreamRealtimeItem>
  ids: string[]
  lastRequestId: string | null
  lastEventAt: number | null
}

export type AlertsRealtimeState = {
  items: AlertRealtimeItem[]
  lastRequestId: string | null
  lastEventAt: number | null
}

export type ChatRealtimeState = {
  byStreamId: Record<string, ChatRealtimeMessage[]>
  lastRequestId: string | null
  lastEventAt: number | null
}

export type AutomationRealtimeState = {
  jobs: Record<string, AutomationRealtimeJob>
  ids: string[]
  lastRequestId: string | null
  lastEventAt: number | null
}

export type EditorJobsRealtimeState = {
  jobs: Record<string, EditorRealtimeJob>
  ids: string[]
  lastRequestId: string | null
  lastEventAt: number | null
}

export const initialStreamsRealtimeState: StreamsRealtimeState = {
  byId: {},
  ids: [],
  lastRequestId: null,
  lastEventAt: null,
}

export const initialAlertsRealtimeState: AlertsRealtimeState = {
  items: [],
  lastRequestId: null,
  lastEventAt: null,
}

export const initialChatRealtimeState: ChatRealtimeState = {
  byStreamId: {},
  lastRequestId: null,
  lastEventAt: null,
}

export const initialAutomationRealtimeState: AutomationRealtimeState = {
  jobs: {},
  ids: [],
  lastRequestId: null,
  lastEventAt: null,
}

export const initialEditorJobsRealtimeState: EditorJobsRealtimeState = {
  jobs: {},
  ids: [],
  lastRequestId: null,
  lastEventAt: null,
}

function applyMeta<T extends { lastRequestId: string | null; lastEventAt: number | null }>(
  state: T,
  event: RealtimeEventEnvelope,
): T {
  return {
    ...state,
    lastRequestId: event.requestId,
    lastEventAt: event.occurredAt,
  }
}

export function reduceStreamsRealtime(state: StreamsRealtimeState, event: RealtimeEventEnvelope): StreamsRealtimeState {
  if (event.channel !== "streams") return state

  if (event.type === "stream.deleted") {
    const payload = event.payload as { id?: string }
    if (!payload.id) return applyMeta(state, event)

    const nextById = { ...state.byId }
    delete nextById[payload.id]

    return applyMeta(
      {
        ...state,
        byId: nextById,
        ids: state.ids.filter((id) => id !== payload.id),
      },
      event,
    )
  }

  if (event.type === "stream.snapshot") {
    const payload = event.payload as { streams?: StreamRealtimeItem[] }
    const streams = payload.streams ?? []
    const byId = streams.reduce<Record<string, StreamRealtimeItem>>((acc, stream) => {
      acc[stream.id] = stream
      return acc
    }, {})

    return applyMeta(
      {
        ...state,
        byId,
        ids: streams.map((stream) => stream.id),
      },
      event,
    )
  }

  const payload = event.payload as Partial<StreamRealtimeItem>
  if (!payload.id) return applyMeta(state, event)

  const existing = state.byId[payload.id]
  const nextStream: StreamRealtimeItem = {
    ...(existing ?? { id: payload.id, status: "scheduled" }),
    ...payload,
  }

  return applyMeta(
    {
      ...state,
      byId: {
        ...state.byId,
        [payload.id]: nextStream,
      },
      ids: state.ids.includes(payload.id) ? state.ids : [payload.id, ...state.ids],
    },
    event,
  )
}

export function reduceAlertsRealtime(state: AlertsRealtimeState, event: RealtimeEventEnvelope): AlertsRealtimeState {
  if (event.channel !== "alerts") return state

  if (event.type === "alert.dismissed") {
    const payload = event.payload as { id?: string }
    if (!payload.id) return applyMeta(state, event)

    return applyMeta(
      {
        ...state,
        items: state.items.filter((item) => item.id !== payload.id),
      },
      event,
    )
  }

  const payload = event.payload as Partial<AlertRealtimeItem>
  if (!payload.id || !payload.message || !payload.createdAt) return applyMeta(state, event)

  const nextAlert: AlertRealtimeItem = {
    id: payload.id,
    message: payload.message,
    createdAt: payload.createdAt,
    module: payload.module,
    severity: payload.severity ?? "info",
  }

  return applyMeta(
    {
      ...state,
      items: [nextAlert, ...state.items.filter((item) => item.id !== nextAlert.id)].slice(0, 100),
    },
    event,
  )
}

export function reduceChatRealtime(state: ChatRealtimeState, event: RealtimeEventEnvelope): ChatRealtimeState {
  if (event.channel !== "chat") return state

  const payload = event.payload as Partial<ChatRealtimeMessage>
  if (!payload.streamId || !payload.id || !payload.message || !payload.createdAt) return applyMeta(state, event)

  const streamMessages = state.byStreamId[payload.streamId] ?? []
  const nextMessage: ChatRealtimeMessage = {
    id: payload.id,
    streamId: payload.streamId,
    message: payload.message,
    createdAt: payload.createdAt,
    userId: payload.userId,
    username: payload.username,
  }

  const nextMessages = [nextMessage, ...streamMessages.filter((item) => item.id !== nextMessage.id)].slice(0, 250)

  return applyMeta(
    {
      ...state,
      byStreamId: {
        ...state.byStreamId,
        [payload.streamId]: nextMessages,
      },
    },
    event,
  )
}

export function reduceAutomationRealtime(
  state: AutomationRealtimeState,
  event: RealtimeEventEnvelope,
): AutomationRealtimeState {
  if (event.channel !== "automation") return state

  if (event.type === "automation.job.deleted") {
    const payload = event.payload as { id?: string }
    if (!payload.id) return applyMeta(state, event)

    const nextJobs = { ...state.jobs }
    delete nextJobs[payload.id]

    return applyMeta(
      {
        ...state,
        jobs: nextJobs,
        ids: state.ids.filter((id) => id !== payload.id),
      },
      event,
    )
  }

  const payload = event.payload as Partial<AutomationRealtimeJob>
  if (!payload.id) return applyMeta(state, event)

  const nextJob: AutomationRealtimeJob = {
    ...(state.jobs[payload.id] ?? { id: payload.id, status: "queued" }),
    ...payload,
  }

  return applyMeta(
    {
      ...state,
      jobs: {
        ...state.jobs,
        [payload.id]: nextJob,
      },
      ids: state.ids.includes(payload.id) ? state.ids : [payload.id, ...state.ids],
    },
    event,
  )
}

export function reduceEditorJobsRealtime(
  state: EditorJobsRealtimeState,
  event: RealtimeEventEnvelope,
): EditorJobsRealtimeState {
  if (event.channel !== "editor-jobs") return state

  const payload = event.payload as Partial<EditorRealtimeJob>
  if (!payload.id) return applyMeta(state, event)

  if (event.type === "editor.job.deleted") {
    const nextJobs = { ...state.jobs }
    delete nextJobs[payload.id]

    return applyMeta(
      {
        ...state,
        jobs: nextJobs,
        ids: state.ids.filter((id) => id !== payload.id),
      },
      event,
    )
  }

  const nextJob: EditorRealtimeJob = {
    ...(state.jobs[payload.id] ?? { id: payload.id, status: "queued" }),
    ...payload,
  }

  return applyMeta(
    {
      ...state,
      jobs: {
        ...state.jobs,
        [payload.id]: nextJob,
      },
      ids: state.ids.includes(payload.id) ? state.ids : [payload.id, ...state.ids],
    },
    event,
  )
}
