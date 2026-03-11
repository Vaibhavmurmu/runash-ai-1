import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { Database } from "@/lib/database"
import { POST } from "@/app/api/streams/[id]/telemetry/route"

test("POST /api/streams/[id]/telemetry validates and ingests playback event", async () => {
  const originalGetStream = Database.getStream

  Database.getStream = (async () => ({ id: "stream-1" })) as typeof Database.getStream

  try {
    const request = new NextRequest("http://localhost/api/streams/stream-1/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-telemetry-1" },
      body: JSON.stringify({
        eventType: "stalled",
        sourceStatus: "recovering",
        stallCount: 2,
        stallDurationMs: 1800,
        reconnectCount: 1,
        streamQuality: "720p",
        targetLatencyBufferMs: 2800,
        retryAttempt: 1,
        playbackUrl: "https://stream.mux.com/abc.m3u8",
      }),
    })

    const response = await POST(request, { params: { id: "stream-1" } })
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(payload.accepted, true)
  } finally {
    Database.getStream = originalGetStream
  }
})
