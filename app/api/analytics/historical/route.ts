import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "7d"
    const streamId = searchParams.get("streamId")

    const userId = session.user.id
    const days = getPeriodDays(period)

    // Build base query conditions
    let streamCondition = "s.user_id = $1"
    const params: any[] = [userId]

    if (streamId) {
      streamCondition += " AND s.id = $2"
      params.push(Number.parseInt(streamId))
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
      AND sa.created_at >= NOW() - INTERVAL '${days} days'
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
      AND sa.created_at >= NOW() - INTERVAL '${days} days'
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
      AND uf.created_at >= NOW() - INTERVAL '${days} days'
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
      AND pt.created_at >= NOW() - INTERVAL '${days} days'
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
      AND sa.created_at >= NOW() - INTERVAL '${days} days'
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
      AND sa.created_at >= NOW() - INTERVAL '${days} days'
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

function getPeriodDays(period: string): number {
  switch (period) {
    case "1d":
      return 1
    case "7d":
      return 7
    case "30d":
      return 30
    case "90d":
      return 90
    case "1y":
      return 365
    default:
      return 7
  }
}
