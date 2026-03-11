import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { requireAnalyticsSession } from "@/app/api/analytics/_lib"

type Params = { params: Promise<{ streamId: string }> }

export async function GET(_req: NextRequest, context: Params) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const { streamId } = await context.params
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(streamId)) {
      return NextResponse.json({ error: "Invalid stream id" }, { status: 400 })
    }

    const [metrics] = await Database.query<{
      bitrate: string | number | null
      fps: string | number | null
      dropped_frames: string | number | null
      bandwidth: string | number | null
      latency: string | number | null
    }>(
      `
      SELECT
        COALESCE(sa.bitrate, 0) AS bitrate,
        COALESCE(sa.fps, 0) AS fps,
        COALESCE(sa.dropped_frames, 0) AS dropped_frames,
        COALESCE(sa.bandwidth, 0) AS bandwidth,
        COALESCE(sa.latency, 0) AS latency
      FROM stream_analytics sa
      JOIN streams s ON s.id = sa.stream_id
      WHERE s.user_id = $1
        AND s.id::text = $2
      ORDER BY sa.created_at DESC
      LIMIT 1
    `,
      [sessionState.userId, streamId],
    )

    const health = {
      bitrate: Number(metrics?.bitrate ?? 0),
      fps: Number(metrics?.fps ?? 0),
      droppedFrames: Number(metrics?.dropped_frames ?? 0),
      bandwidth: Number(metrics?.bandwidth ?? 0),
      latency: Number(metrics?.latency ?? 0),
    }

    return NextResponse.json({
      ...health,
      quality: deriveQuality(health),
      issues: deriveIssues(health),
    })
  } catch (error) {
    console.error("Stream health analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function deriveQuality(metrics: { bitrate: number; droppedFrames: number; latency: number }) {
  if (metrics.droppedFrames > 100 || metrics.bitrate < 1200 || metrics.latency > 200) return "poor"
  if (metrics.droppedFrames > 25 || metrics.bitrate < 2200 || metrics.latency > 120) return "fair"
  if (metrics.droppedFrames > 5 || metrics.bitrate < 3200 || metrics.latency > 80) return "good"
  return "excellent"
}

function deriveIssues(metrics: { droppedFrames: number; latency: number; bitrate: number }) {
  const issues: Array<{ type: string; severity: string; message: string; timestamp: string }> = []
  const now = new Date().toISOString()

  if (metrics.droppedFrames > 25) {
    issues.push({
      type: "dropped_frames",
      severity: metrics.droppedFrames > 100 ? "high" : "medium",
      message: `Dropped frames detected: ${metrics.droppedFrames}`,
      timestamp: now,
    })
  }

  if (metrics.latency > 120) {
    issues.push({
      type: "latency",
      severity: metrics.latency > 200 ? "high" : "medium",
      message: `High stream latency: ${metrics.latency}ms`,
      timestamp: now,
    })
  }

  if (metrics.bitrate < 2200) {
    issues.push({
      type: "bitrate",
      severity: metrics.bitrate < 1200 ? "high" : "low",
      message: `Low bitrate: ${metrics.bitrate} kbps`,
      timestamp: now,
    })
  }

  return issues
}
