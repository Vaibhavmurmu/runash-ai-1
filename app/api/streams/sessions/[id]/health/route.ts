import { NextResponse } from "next/server"

import { Database } from "@/lib/database"
import { listStreamSessionNetworkMetrics } from "@/lib/repositories/stream-session-network-metrics"

export async function GET(_: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 })

  const metrics = await listStreamSessionNetworkMetrics(params.id, 1)
  const latest = metrics.at(-1)

  return NextResponse.json({
    telemetry: {
      status: latest?.healthState ?? "good",
      score: latest?.healthScore ?? 80,
      bitrateKbps: latest?.bitrateKbps ?? 0,
      rttMs: latest?.rttMs ?? 0,
      packetLossPct: latest?.packetLossPct ?? 0,
      droppedFrames: latest?.droppedFrames ?? 0,
      reconnects: latest?.reconnects ?? 0,
      sampledAt: latest?.sampledAt?.toISOString() ?? null,
    },
  })
}
