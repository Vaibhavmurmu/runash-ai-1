import { z } from "zod"
import type { MultiStreamSession, PlatformAnalytics } from "@/lib/multi-platform-service"

export const streamHealthSchema = z.enum(["excellent", "good", "fair", "poor"])

export const platformAnalyticsSchema = z.object({
  platform_id: z.string(),
  viewers: z.number(),
  chat_messages: z.number(),
  likes: z.number(),
  shares: z.number(),
  followers_gained: z.number(),
  watch_time: z.number(),
  peak_viewers: z.number(),
  engagement_rate: z.number(),
  stream_health: streamHealthSchema,
  bitrate_actual: z.number(),
  fps_actual: z.number(),
  dropped_frames: z.number(),
  timestamp: z.string(),
}) satisfies z.ZodType<PlatformAnalytics>

export const multiStreamSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  platforms: z.array(z.string()),
  status: z.enum(["scheduled", "live", "ended", "error"]),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  total_viewers: z.number(),
  peak_viewers: z.number(),
  duration: z.number(),
  settings: z.object({
    master_bitrate: z.number(),
    master_resolution: z.object({ width: z.number(), height: z.number() }),
    master_fps: z.number(),
    enable_adaptive_bitrate: z.boolean(),
    enable_auto_failover: z.boolean(),
  }),
}) satisfies z.ZodType<MultiStreamSession>

export const platformAnalyticsListResponseSchema = z.object({
  analytics: z.array(platformAnalyticsSchema),
})

export const multiStreamAnalyticsResponseSchema = z.object({
  session: multiStreamSessionSchema,
  platforms: z.array(platformAnalyticsSchema.extend({ platform_name: z.string() })),
  aggregated: z.object({
    total_viewers: z.number(),
    total_chat_messages: z.number(),
    total_engagement: z.number(),
    average_stream_health: z.string(),
  }),
})

export const startMultiStreamBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  platforms: z.array(z.string()).min(1),
  total_viewers: z.number().default(0),
  peak_viewers: z.number().default(0),
  duration: z.number().default(0),
  settings: multiStreamSessionSchema.shape.settings,
})

export const updateTitleBodySchema = z.object({
  title: z.string().min(1),
})
