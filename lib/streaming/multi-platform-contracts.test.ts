import assert from "node:assert/strict"
import test from "node:test"

import type { MultiStreamSession, PlatformAnalytics } from "@/lib/multi-platform-service"
import {
  multiStreamAnalyticsResponseSchema,
  multiStreamSessionSchema,
  platformAnalyticsListResponseSchema,
  platformAnalyticsSchema,
} from "@/lib/streaming/multi-platform-contracts"

test("platform analytics schema matches frontend PlatformAnalytics contract", () => {
  const payload = {
    platform_id: "platform_youtube",
    viewers: 120,
    chat_messages: 35,
    likes: 75,
    shares: 12,
    followers_gained: 8,
    watch_time: 2400,
    peak_viewers: 180,
    engagement_rate: 14.2,
    stream_health: "good",
    bitrate_actual: 4200,
    fps_actual: 30,
    dropped_frames: 2,
    timestamp: new Date().toISOString(),
  }

  const validated = platformAnalyticsSchema.parse(payload)
  const typed: PlatformAnalytics = validated

  assert.equal(typed.platform_id, payload.platform_id)
  assert.equal(typed.stream_health, "good")
})

test("multi-stream session schema matches frontend MultiStreamSession contract", () => {
  const payload = {
    id: "session_1",
    user_id: "user_1",
    title: "Launch Stream",
    description: "Product reveal",
    platforms: ["youtube", "twitch"],
    status: "live",
    start_time: new Date().toISOString(),
    total_viewers: 0,
    peak_viewers: 0,
    duration: 0,
    settings: {
      master_bitrate: 4500,
      master_resolution: { width: 1920, height: 1080 },
      master_fps: 30,
      enable_adaptive_bitrate: true,
      enable_auto_failover: true,
    },
  }

  const validated = multiStreamSessionSchema.parse(payload)
  const typed: MultiStreamSession = validated

  assert.equal(typed.status, "live")
  assert.deepEqual(typed.platforms, ["youtube", "twitch"])
})

test("analytics endpoint response contract stays compatible with service expectations", () => {
  const payload = {
    analytics: [
      {
        platform_id: "platform_youtube",
        viewers: 120,
        chat_messages: 35,
        likes: 75,
        shares: 12,
        followers_gained: 8,
        watch_time: 2400,
        peak_viewers: 180,
        engagement_rate: 14.2,
        stream_health: "good",
        bitrate_actual: 4200,
        fps_actual: 30,
        dropped_frames: 2,
        timestamp: new Date().toISOString(),
      },
    ],
  }

  const validated = platformAnalyticsListResponseSchema.parse(payload)
  assert.equal(validated.analytics.length, 1)
  assert.equal(validated.analytics[0].platform_id, "platform_youtube")
})

test("multi-stream analytics endpoint response contract stays compatible with service expectations", () => {
  const payload = {
    session: {
      id: "session_1",
      user_id: "user_1",
      title: "Launch Stream",
      platforms: ["youtube", "twitch"],
      status: "live",
      start_time: new Date().toISOString(),
      total_viewers: 300,
      peak_viewers: 420,
      duration: 1800,
      settings: {
        master_bitrate: 4500,
        master_resolution: { width: 1920, height: 1080 },
        master_fps: 30,
        enable_adaptive_bitrate: true,
        enable_auto_failover: true,
      },
    },
    platforms: [
      {
        platform_id: "platform_youtube",
        platform_name: "YouTube",
        viewers: 120,
        chat_messages: 35,
        likes: 75,
        shares: 12,
        followers_gained: 8,
        watch_time: 2400,
        peak_viewers: 180,
        engagement_rate: 14.2,
        stream_health: "good",
        bitrate_actual: 4200,
        fps_actual: 30,
        dropped_frames: 2,
        timestamp: new Date().toISOString(),
      },
    ],
    aggregated: {
      total_viewers: 120,
      total_chat_messages: 35,
      total_engagement: 14.2,
      average_stream_health: "good",
    },
  }

  const validated = multiStreamAnalyticsResponseSchema.parse(payload)
  assert.equal(validated.platforms[0].platform_name, "YouTube")
  assert.equal(validated.aggregated.average_stream_health, "good")
})
