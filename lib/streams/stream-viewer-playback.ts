export type StreamQuality = "1080p" | "720p" | "480p"
export type SourceStatus = "healthy" | "recovering" | "failed"

export type PlaybackEventType = "waiting" | "stalled" | "playing" | "error" | "reconnect_attempt" | "recovered"

export type ViewerQoeState = {
  sourceStatus: SourceStatus
  stallCount: number
  stallDurationMs: number
  reconnectCount: number
  retryAttempt: number
  isRebuffering: boolean
  isCatchingUp: boolean
  streamQuality: StreamQuality
  targetLatencyBufferMs: number
}

export type ViewerTelemetryPayload = {
  eventType: PlaybackEventType
  sourceStatus: SourceStatus
  stallCount: number
  stallDurationMs: number
  reconnectCount: number
  streamQuality: StreamQuality
  targetLatencyBufferMs: number
  retryAttempt: number
  playbackUrl: string
}

export function nextViewerQoeState(
  current: ViewerQoeState,
  input: { eventType: PlaybackEventType; stallElapsedMs?: number },
): ViewerQoeState {
  switch (input.eventType) {
    case "waiting":
    case "stalled":
      return {
        ...current,
        sourceStatus: "recovering",
        isRebuffering: true,
        stallCount: current.stallCount + 1,
      }
    case "playing":
      return {
        ...current,
        sourceStatus: "healthy",
        isRebuffering: false,
        reconnectCount: current.sourceStatus === "healthy" ? current.reconnectCount : current.reconnectCount + 1,
        isCatchingUp: current.sourceStatus === "healthy" ? current.isCatchingUp : true,
        stallDurationMs: current.stallDurationMs + (input.stallElapsedMs ?? 0),
      }
    case "error":
      return {
        ...current,
        sourceStatus: "failed",
        isRebuffering: false,
        isCatchingUp: false,
      }
    case "reconnect_attempt":
      return {
        ...current,
        sourceStatus: "recovering",
        retryAttempt: current.retryAttempt + 1,
      }
    case "recovered":
      return {
        ...current,
        sourceStatus: "healthy",
        reconnectCount: current.reconnectCount + 1,
        isRebuffering: false,
        isCatchingUp: true,
      }
    default:
      return current
  }
}

export function buildViewerTelemetryPayload(state: ViewerQoeState, input: { eventType: PlaybackEventType; playbackUrl: string }): ViewerTelemetryPayload {
  return {
    eventType: input.eventType,
    playbackUrl: input.playbackUrl,
    sourceStatus: state.sourceStatus,
    stallCount: state.stallCount,
    stallDurationMs: state.stallDurationMs,
    reconnectCount: state.reconnectCount,
    streamQuality: state.streamQuality,
    targetLatencyBufferMs: state.targetLatencyBufferMs,
    retryAttempt: state.retryAttempt,
  }
}
