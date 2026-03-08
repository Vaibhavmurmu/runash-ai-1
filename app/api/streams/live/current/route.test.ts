import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { handleGetCurrentLiveStream } from "./route"

const baseSession = {
  id: "stream_live_1",
  userId: "user_1",
  title: "Farm Fresh Friday",
  description: "Fresh picks",
  category: "Organic Produce",
  status: "live" as const,
  startTime: "2026-03-08T10:00:00.000Z",
  maxViewers: 480,
  viewerCount: 320,
  totalRevenue: 1250,
  thumbnailUrl: "https://cdn.runash.in/thumbs/stream_live_1.jpg",
  streamUrl: "https://cdn.runash.in/live/stream_live_1.m3u8",
  hostName: "RunAsh Host",
  hostAvatar: "https://cdn.runash.in/avatars/user_1.jpg",
  tags: ["organic", "farm"],
  featuredProducts: ["101", "202"],
}

test("GET /api/streams/live/current returns persisted live state when an active stream exists", async () => {
  const request = new NextRequest("http://localhost/api/streams/live/current", {
    headers: {
      cookie: "runash-live-follow=stream_live_1",
    },
  })

  const response = await handleGetCurrentLiveStream(request, {
    getActiveLiveStreamSession: async () => baseSession,
    getLiveControlState: async () => ({ moderation: { polls: [{ id: "poll_1" }] } }) as never,
    listStreamSessionNetworkMetrics: async () =>
      [
        {
          healthState: "good",
          healthScore: 80,
          sampledAt: new Date("2026-03-08T10:10:00.000Z"),
          reconnects: 1,
          droppedFrames: 0,
        },
      ] as never,
    listStreamProductReferences: async (ids: string[]) => ids,
    getStreamCommercialStats: async () => ({ purchases: 7, revenue: 1550 }),
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.stream.id, "stream_live_1")
  assert.equal(payload.stream.hostId, "user_1")
  assert.equal(payload.stream.featuredProducts.length, 2)
  assert.equal(payload.stats.purchases, 7)
  assert.equal(payload.stats.revenue, 1550)
  assert.equal(payload.stats.network.health, "good")
  assert.equal(payload.follow.isFollowing, true)
})

test("GET /api/streams/live/current returns none-live payload when no active stream is found", async () => {
  const response = await handleGetCurrentLiveStream(new NextRequest("http://localhost/api/streams/live/current"), {
    getActiveLiveStreamSession: async () => null,
    getLiveControlState: async () => null as never,
    listStreamSessionNetworkMetrics: async () => [] as never,
    listStreamProductReferences: async () => [],
    getStreamCommercialStats: async () => ({ purchases: 0, revenue: 0 }),
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.stream, null)
  assert.equal(payload.stats.streamId, null)
  assert.equal(payload.stats.viewerCount, 0)
  assert.equal(payload.follow.isFollowing, false)
})
