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

export interface StreamHealthTelemetry {
  status: "Excellent" | "Good" | "Fair" | "Poor"
  bitrate: number
  fps: number
  dropped: number
  latency: number
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
  return readJson<{ metrics: StreamLiveMetrics }>(response)
}

export async function getStreamHealthTelemetry(id: string) {
  const response = await fetch(`/api/streams/sessions/${id}/health`, { cache: "no-store" })
  return readJson<{ telemetry: StreamHealthTelemetry }>(response)
}
