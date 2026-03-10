export interface StreamSession {
  id: string
  title: string
  status: "scheduled" | "live" | "ended"
  platform: string
  viewer_count: number
  startedAt?: string
  endedAt?: string
}

export interface StreamLiveMetrics {
  viewers: number
  likes: number
  comments: number
  shares: number
  durationSeconds: number
}

export type StreamHealthStatus = "excellent" | "good" | "fair" | "poor"

export interface StreamNetworkSample {
  bitrateKbps: number
  rttMs: number
  packetLossPct: number
  droppedFrames: number
  reconnects: number
  health: StreamHealthStatus
  healthScore: number
  sampledAt: string
}

export interface StreamHealthTelemetry {
  status: StreamHealthStatus
  score: number
  bitrateKbps: number
  rttMs: number
  packetLossPct: number
  droppedFrames: number
  reconnects: number
  sampledAt: string | null
}

export interface StreamingPlatformStatus {
  id: string
  name: string
  platform_type: string
  is_connected: boolean
  connection_status: "connected" | "disconnected" | "error" | "testing"
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Request failed")
  return res.json() as Promise<T>
}

export async function createStreamSession(payload: { title: string; description?: string; platform?: string }) {
  const response = await fetch("/api/streams/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return readJson<{ session: StreamSession }>(response)
}

export async function startStreamSession(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/start`, { method: "POST" })
  return readJson<{ session: StreamSession }>(response)
}

export async function endStreamSession(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/end`, { method: "POST" })
  return readJson<{ session: StreamSession }>(response)
}

export async function getStreamLiveMetrics(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/metrics`, { cache: "no-store" })
  return readJson<{ metrics: StreamLiveMetrics; network: { latest: StreamNetworkSample | null; series: StreamNetworkSample[] } }>(response)
}

export async function reportStreamNetworkMetrics(
  id: string,
  payload: {
    bitrateKbps: number
    rttMs: number
    packetLossPct: number
    droppedFrames: number
    reconnects: number
    sampledAt?: string
  },
) {
  const response = await fetch(`/api/streams/sessions/${id}/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return readJson<{ telemetry: { id: string; health: StreamHealthStatus; healthScore: number; sampledAt: string } }>(response)
}

export async function getStreamHealthTelemetry(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/health`, { cache: "no-store" })
  return readJson<{ telemetry: StreamHealthTelemetry }>(response)
}

export async function getSessionPlatformState(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/platforms`, { cache: "no-store" })
  return readJson<{ sessionId: string; selectedPlatformIds: string[]; platforms: StreamingPlatformStatus[] }>(response)
}

export async function updateSessionPlatformState(id: string, selectedPlatformIds: string[]) {
  const response = await fetch(`/api/streams/sessions/${id}/platforms`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedPlatformIds }),
  })
  return readJson<{ sessionId: string; selectedPlatformIds: string[]; platforms: StreamingPlatformStatus[] }>(response)
}
