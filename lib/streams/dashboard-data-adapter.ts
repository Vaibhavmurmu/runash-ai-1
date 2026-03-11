import type { DashboardRecentStream, DashboardScheduledStream } from "@/lib/types/dashboard-streams"

export type StreamSessionKind = "live" | "scheduled" | "history"

export type StreamSession = {
  id: string
  title: string
  category?: string
  status: string
  startsAt: string
  url: string
  viewers?: number
  duration?: string | null
  kind: StreamSessionKind
}

export type StreamBuckets = {
  liveSessions: StreamSession[]
  scheduledStreams: StreamSession[]
  endedStreams: StreamSession[]
}

function normalizeRecentStream(stream: DashboardRecentStream): StreamSession {
  return {
    id: stream.id,
    title: stream.title,
    category: stream.category,
    status: stream.status,
    startsAt: stream.date,
    url: stream.url,
    viewers: stream.viewers,
    duration: stream.duration,
    kind: stream.status === "live" ? "live" : "history",
  }
}

function normalizeScheduledStream(stream: DashboardScheduledStream): StreamSession {
  return {
    id: stream.id,
    title: stream.title,
    category: stream.category,
    status: stream.status,
    startsAt: stream.startsAt,
    url: stream.url ?? "",
    kind: "scheduled",
  }
}

export function adaptDashboardStreams(input: {
  recent: DashboardRecentStream[]
  scheduled: DashboardScheduledStream[]
}): StreamBuckets {
  const normalizedRecent = input.recent.map(normalizeRecentStream)
  const liveSessions = normalizedRecent.filter((stream) => stream.kind === "live")
  const endedStreams = normalizedRecent.filter((stream) => stream.kind === "history")

  const scheduledStreams = input.scheduled
    .filter((stream) => stream.status === "scheduled")
    .map(normalizeScheduledStream)

  return { liveSessions, scheduledStreams, endedStreams }
}
