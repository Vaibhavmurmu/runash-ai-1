export const LIVE_STREAM_SESSION_STATUSES = ["draft", "starting", "live", "stopping", "ended", "failed"] as const

export type LiveStreamSessionStatus = (typeof LIVE_STREAM_SESSION_STATUSES)[number]

export const LIVE_STREAM_LATENCY_PROFILES = ["normal", "low", "ultra_low"] as const

export type LiveStreamLatencyProfile = (typeof LIVE_STREAM_LATENCY_PROFILES)[number]

export type LiveStreamPlaybackUrl = {
  protocol: "hls" | "dash" | "webrtc"
  url: string
}

export type LiveStreamSession = {
  id: string
  ownerUserId: number
  workspaceId: string | null
  title: string | null
  status: LiveStreamSessionStatus
  playbackUrls: LiveStreamPlaybackUrl[]
  dvrEnabled: boolean
  latencyProfile: LiveStreamLatencyProfile
  ingestEndpoint: LiveStreamEndpoint | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
  startingAt: string | null
  liveAt: string | null
  stoppingAt: string | null
  endedAt: string | null
  failedAt: string | null
}

export type LiveStreamEndpoint = {
  id: string
  sessionId: string
  provider: string
  ingestUrl: string
  ingestTokenMasked: string
  tokenExpiresAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type LiveStreamEvent = {
  id: string
  sessionId: string
  eventType: string
  fromStatus: LiveStreamSessionStatus | null
  toStatus: LiveStreamSessionStatus
  actorUserId: number | null
  idempotencyKey: string | null
  reason: string | null
  payload: Record<string, unknown>
  occurredAt: string
}

export type LiveStreamSessionResponse = {
  session: LiveStreamSession
}

export type LiveStreamEventsResponse = {
  events: LiveStreamEvent[]
}
