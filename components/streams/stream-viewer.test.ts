import assert from "node:assert/strict"
import test from "node:test"

import { resolvePlaybackUrl } from "@/components/streams/stream-viewer"

test("resolvePlaybackUrl prefers provider playback URL metadata for player pipeline", () => {
  const playbackUrl = resolvePlaybackUrl({
    metadata: {
      provider: {
        playbackUrls: [{ protocol: "hls", url: "https://cdn.internal.test/hls/stream-1.m3u8" }],
      },
    },
    stream: {
      playback_url: "https://fallback.invalid/stream.m3u8",
    },
  })

  assert.equal(playbackUrl, "https://cdn.internal.test/hls/stream-1.m3u8")
})
