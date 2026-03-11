import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { logApiEvent } from "@/lib/api/logging"
import { Database } from "@/lib/database"

const ROUTE = "/api/streams/[id]/telemetry"

const telemetrySchema = z.object({
  eventType: z.enum(["waiting", "stalled", "playing", "error", "reconnect_attempt", "recovered"]),
  sourceStatus: z.enum(["healthy", "recovering", "failed"]),
  stallCount: z.number().int().min(0),
  stallDurationMs: z.number().int().min(0),
  reconnectCount: z.number().int().min(0),
  streamQuality: z.enum(["1080p", "720p", "480p"]),
  targetLatencyBufferMs: z.number().int().min(0),
  retryAttempt: z.number().int().min(0),
  playbackUrl: z.string().url(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id") ?? crypto.randomUUID()

  const stream = await Database.getStream(params.id)
  if (!stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = telemetrySchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid telemetry payload", details: parsed.error.flatten() }, { status: 400 })
  }

  logApiEvent("info", "streams.viewer.telemetry_ingested", {
    requestId,
    route: ROUTE,
    method: request.method,
    details: {
      streamId: params.id,
      eventType: parsed.data.eventType,
      sourceStatus: parsed.data.sourceStatus,
      stallCount: parsed.data.stallCount,
      stallDurationMs: parsed.data.stallDurationMs,
      reconnectCount: parsed.data.reconnectCount,
      streamQuality: parsed.data.streamQuality,
      targetLatencyBufferMs: parsed.data.targetLatencyBufferMs,
      retryAttempt: parsed.data.retryAttempt,
    },
  })

  return NextResponse.json({ accepted: true })
}
