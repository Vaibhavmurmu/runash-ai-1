import { NextRequest, NextResponse } from "next/server"

import { Database } from "@/lib/database"
import { snapshotRuntime } from "@/lib/stream-session-state"
import { streamNetworkMetricSchema } from "@/lib/stream-network-telemetry"
import {
  createStreamSessionNetworkMetric,
  listStreamSessionNetworkMetrics,
} from "@/lib/repositories/stream-session-network-metrics"

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 })

  const runtime = snapshotRuntime(params.id)
  const startedAt = stream.start_time ? new Date(stream.start_time) : null
  const durationSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0
  const networkSeries = await listStreamSessionNetworkMetrics(params.id)

  const latest = networkSeries.at(-1)

  return NextResponse.json({
    metrics: {
      viewers: stream.viewer_count ?? 0,
      likes: runtime.likes,
      comments: runtime.comments,
      shares: runtime.shares,
      durationSeconds,
    },
    network: {
      latest: latest
        ? {
            bitrateKbps: latest.bitrateKbps,
            rttMs: latest.rttMs,
            packetLossPct: latest.packetLossPct,
            droppedFrames: latest.droppedFrames,
            reconnects: latest.reconnects,
            health: latest.healthState,
            healthScore: latest.healthScore,
            sampledAt: latest.sampledAt.toISOString(),
          }
        : null,
      series: networkSeries.map((sample) => ({
        bitrateKbps: sample.bitrateKbps,
        rttMs: sample.rttMs,
        packetLossPct: sample.packetLossPct,
        droppedFrames: sample.droppedFrames,
        reconnects: sample.reconnects,
        health: sample.healthState,
        healthScore: sample.healthScore,
        sampledAt: sample.sampledAt.toISOString(),
      })),
    },
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = streamNetworkMetricSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid telemetry payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const saved = await createStreamSessionNetworkMetric({
    sessionId: params.id,
    streamId: params.id,
    ...parsed.data,
  })

  return NextResponse.json({
    telemetry: {
      id: saved.id,
      health: saved.healthState,
      healthScore: saved.healthScore,
      sampledAt: saved.sampledAt.toISOString(),
    },
  })
}
