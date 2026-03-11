import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import {
  type AnalyticsPeriod,
  parseOptionalStreamId,
  parsePeriod,
  requireAnalyticsSession,
} from "@/app/api/analytics/_lib"

const PERIOD_TO_INTERVAL: Record<AnalyticsPeriod, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "365 days",
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAnalyticsSession()
    if ("error" in auth) {
      return auth.error
    }

    const { searchParams } = new URL(req.url)

    const periodResult = parsePeriod(searchParams)
    if (!periodResult.ok) {
      return periodResult.response
    }

    const streamResult = parseOptionalStreamId(searchParams)
    if (!streamResult.ok) {
      return streamResult.response
    }

    const userId = auth.userId
    const interval = PERIOD_TO_INTERVAL[periodResult.period]

    // Build base query conditions
    let streamCondition = "s.user_id = $1"
    const params: string[] = [userId]

    if (streamResult.streamId) {
      streamCondition += " AND s.id = $2"
      params.push(streamResult.streamId)
    }

    // Get historical viewer counts
    const viewerCounts = await Database.query(
      `
      SELECT 
        DATE(sa.created_at) as date,
        AVG(sa.average_viewers) as value
      FROM stream_analytics sa
      JOIN streams s ON sa.stream_id = s.id
      WHERE ${streamCondition}
      AND sa.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(sa.created_at)
      ORDER BY date
    `,
      params,
    )

    // Get chat activity
    const chatActivity = await Database.query(
      `
      SELECT 
        DATE(sa.created_at) as date,
        SUM(sa.chat_messages) as value
      FROM stream_analytics sa
      JOIN streams s ON sa.stream_id = s.id
      WHERE ${streamCondition}
      AND sa.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(sa.created_at)
      ORDER BY date
    `,
      params,
    )

    // Get follower growth
    const followerGrowth = await Database.query(
      `
      SELECT 
        DATE(uf.created_at) as date,
        COUNT(*) as value
      FROM user_followers uf
      WHERE uf.user_id = $1
      AND uf.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(uf.created_at)
      ORDER BY date
    `,
      [userId],
    )

    // Get revenue data
    const revenue = await Database.query(
      `
      SELECT 
        DATE(pt.created_at) as date,
        SUM(pt.amount) as value
      FROM payment_transactions pt
      WHERE pt.user_id = $1
      AND pt.created_at >= NOW() - INTERVAL '${interval}'
      AND pt.status = 'succeeded'
      GROUP BY DATE(pt.created_at)
      ORDER BY date
    `,
      [userId],
    )

    // Get engagement data
    const engagement = await Database.query(
      `
      SELECT 
        DATE(sa.created_at) as date,
        AVG(sa.engagement) as value
      FROM stream_analytics sa
      JOIN streams s ON sa.stream_id = s.id
      WHERE ${streamCondition}
      AND sa.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(sa.created_at)
      ORDER BY date
    `,
      params,
    )

    // Get watch time data
    const watchTime = await Database.query(
      `
      SELECT 
        DATE(sa.created_at) as date,
        SUM(sa.watch_time) as value
      FROM stream_analytics sa
      JOIN streams s ON sa.stream_id = s.id
      WHERE ${streamCondition}
      AND sa.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(sa.created_at)
      ORDER BY date
    `,
      params,
    )

    // Format data for charts
    const formatTimeSeriesData = (data: any[]) =>
      data.map((row) => ({
        timestamp: row.date,
        value: Number.parseFloat(row.value) || 0,
      }))

    return NextResponse.json({
      viewerCounts: formatTimeSeriesData(viewerCounts),
      chatActivity: formatTimeSeriesData(chatActivity),
      followerGrowth: formatTimeSeriesData(followerGrowth),
      revenue: formatTimeSeriesData(revenue),
      engagement: formatTimeSeriesData(engagement),
      watchTime: formatTimeSeriesData(watchTime),
    })
  } catch (error) {
    console.error("Historical analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
