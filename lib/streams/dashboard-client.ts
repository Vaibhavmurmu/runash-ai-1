import type {
  DashboardRecentStream,
  DashboardRecentStreamsResponse,
  DashboardScheduledStream,
  DashboardScheduledStreamsResponse,
} from "@/lib/types/dashboard-streams"

export type DashboardStreamPayload = {
  recent: DashboardRecentStream[]
  scheduled: DashboardScheduledStream[]
}

function coerceData<T>(payload: unknown, key: string): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const envelope = payload as { data?: Record<string, unknown> }
    return (envelope.data?.[key] ?? []) as T
  }
  if (payload && typeof payload === "object") {
    const legacy = payload as Record<string, unknown>
    return (legacy[key] ?? []) as T
  }
  return [] as T
}

export async function listDashboardStreams(): Promise<DashboardStreamPayload> {
  const [recentResponse, scheduledResponse] = await Promise.all([
    fetch("/api/dashboard/streams?limit=50", { cache: "no-store" }),
    fetch("/api/dashboard/streams/scheduled", { cache: "no-store" }),
  ])

  if (!recentResponse.ok || !scheduledResponse.ok) {
    throw new Error("Failed to load stream dashboard")
  }

  const recentPayload = (await recentResponse.json()) as DashboardRecentStreamsResponse | { data: DashboardRecentStreamsResponse }
  const scheduledPayload = (await scheduledResponse.json()) as DashboardScheduledStreamsResponse | { data: DashboardScheduledStreamsResponse }

  return {
    recent: coerceData<DashboardRecentStream[]>(recentPayload, "streams"),
    scheduled: coerceData<DashboardScheduledStream[]>(scheduledPayload, "streams"),
  }
}

export async function createLiveStream(title: string) {
  return fetch("/api/dashboard/streams/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

export async function scheduleStream(title: string, startsAt: string) {
  return fetch("/api/dashboard/streams/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, startsAt }),
  })
}

export async function updateScheduledStream(id: string, payload: Record<string, unknown>) {
  return fetch(`/api/dashboard/streams/schedule/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function deleteScheduledStream(id: string) {
  return fetch(`/api/dashboard/streams/schedule/${id}`, { method: "DELETE" })
}
