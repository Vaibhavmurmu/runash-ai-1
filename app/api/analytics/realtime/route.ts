import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get current active streams
    const activeStreams = await Database.query(
      `
      SELECT s.*, sa.* FROM streams s
      LEFT JOIN stream_analytics sa ON s.id = sa.stream_id
      WHERE s.user_id = $1 AND s.status = 'live'
    `,
      [userId],
    )

    // Get current viewer counts
    const currentViewers = await Database.query(
      `
      SELECT COUNT(*) as count FROM stream_viewers sv
      JOIN streams s ON sv.stream_id = s.id
      WHERE s.user_id = $1 AND sv.left_at IS NULL
    `,
      [userId],
    )

    // Get today's metrics
    const todayMetrics = await Database.query(
      `
      SELECT 
        COALESCE(SUM(sa.total_views), 0) as total_views,
        COALESCE(MAX(sa.peak_viewers), 0) as peak_viewers,
        COALESCE(AVG(sa.average_viewers), 0) as average_viewers,
        COALESCE(SUM(sa.watch_time), 0) as watch_time,
        COALESCE(SUM(sa.chat_messages), 0) as chat_messages,
        COALESCE(SUM(sa.new_followers), 0) as new_followers,
        COALESCE(SUM(sa.donations), 0) as donations,
        COALESCE(AVG(sa.engagement), 0) as engagement
      FROM stream_analytics sa
      JOIN streams s ON sa.stream_id = s.id
      WHERE s.user_id = $1 AND DATE(sa.created_at) = CURRENT_DATE
    `,
      [userId],
    )

    // Calculate revenue from subscriptions and donations
    const revenue = await Database.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM payment_transactions pt
      WHERE pt.user_id = $1 AND DATE(pt.created_at) = CURRENT_DATE
      AND pt.status = 'succeeded'
    `,
      [userId],
    )

    // Get subscription count
    const subscriptions = await Database.query(
      `
      SELECT COUNT(*) as count FROM user_subscriptions
      WHERE user_id = $1 AND status = 'active'
    `,
      [userId],
    )

    const metrics = todayMetrics[0] || {}
    const streamHealth = calculateStreamHealth(activeStreams[0])

    const analyticsData = {
      totalViews: Number.parseInt(metrics.total_views) || 0,
      currentViewers: Number.parseInt(currentViewers[0]?.count) || 0,
      peakViewers: Number.parseInt(metrics.peak_viewers) || 0,
      averageViewers: Math.round(Number.parseFloat(metrics.average_viewers)) || 0,
      watchTime: Number.parseInt(metrics.watch_time) || 0,
      chatMessages: Number.parseInt(metrics.chat_messages) || 0,
      newFollowers: Number.parseInt(metrics.new_followers) || 0,
      donations: Number.parseInt(metrics.donations) || 0,
      engagement: Number.parseFloat(metrics.engagement) || 0,
      streamHealth,
      revenue: Number.parseFloat(revenue[0]?.total_revenue) || 0,
      subscriptions: Number.parseInt(subscriptions[0]?.count) || 0,
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error("Real-time analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateStreamHealth(stream: any): "Excellent" | "Good" | "Fair" | "Poor" {
  if (!stream) return "Poor"

  const bitrate = stream.bitrate || 0
  const droppedFrames = stream.dropped_frames || 0

  if (droppedFrames > 3 || bitrate < 2000) return "Poor"
  if (droppedFrames > 1 || bitrate < 2200) return "Fair"
  if (droppedFrames > 0 || bitrate < 2400) return "Good"
  return "Excellent"
}
