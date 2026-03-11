import assert from "node:assert/strict"
import test from "node:test"

import { buildViewerTelemetryPayload, nextViewerQoeState, type ViewerQoeState } from "@/lib/streams/stream-viewer-playback"

function baseState(): ViewerQoeState {
  return {
    sourceStatus: "healthy",
    stallCount: 0,
    stallDurationMs: 0,
    reconnectCount: 0,
    retryAttempt: 0,
    isRebuffering: false,
    isCatchingUp: false,
    streamQuality: "1080p",
    targetLatencyBufferMs: 1700,
  }
}

test("e2e-style playback recovery flow increments stalls and reconnect on recovery", () => {
  const afterWaiting = nextViewerQoeState(baseState(), { eventType: "waiting" })
  assert.equal(afterWaiting.sourceStatus, "recovering")
  assert.equal(afterWaiting.stallCount, 1)
  assert.equal(afterWaiting.isRebuffering, true)

  const afterPlaying = nextViewerQoeState(afterWaiting, { eventType: "playing", stallElapsedMs: 1400 })
  assert.equal(afterPlaying.sourceStatus, "healthy")
  assert.equal(afterPlaying.stallDurationMs, 1400)
  assert.equal(afterPlaying.reconnectCount, 1)
  assert.equal(afterPlaying.isCatchingUp, true)
})

test("metric emission payload captures current QoE counters and playback URL", () => {
  const state: ViewerQoeState = {
    ...baseState(),
    sourceStatus: "recovering",
    stallCount: 3,
    stallDurationMs: 6400,
    reconnectCount: 2,
    retryAttempt: 1,
    streamQuality: "720p",
    targetLatencyBufferMs: 2900,
  }

  const payload = buildViewerTelemetryPayload(state, {
    eventType: "stalled",
    playbackUrl: "https://stream.mux.com/test.m3u8",
  })

  assert.equal(payload.eventType, "stalled")
  assert.equal(payload.sourceStatus, "recovering")
  assert.equal(payload.stallCount, 3)
  assert.equal(payload.stallDurationMs, 6400)
  assert.equal(payload.reconnectCount, 2)
  assert.equal(payload.retryAttempt, 1)
  assert.equal(payload.streamQuality, "720p")
  assert.equal(payload.targetLatencyBufferMs, 2900)
  assert.equal(payload.playbackUrl, "https://stream.mux.com/test.m3u8")
})
