import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"

export async function GET(req: NextRequest) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const periodState = parsePeriod(new URL(req.url).searchParams)
    if (!periodState.ok) {
      return periodState.response
    }

    const days = periodToDays(periodState.period)
    const rows = await Database.query<{
      platform: string | null
      viewers: string | number | null
      chat_messages: string | number | null
      followers: string | number | null
      subscribers: string | number | null
      donations: string | number | null
      revenue: string | number | null
      engagement: string | number | null
    }>(
      `
      SELECT
        COALESCE(s.platform, 'unknown') AS platform,
        COALESCE(SUM(sa.total_views), 0) AS viewers,
        COALESCE(SUM(sa.chat_messages), 0) AS chat_messages,
        COALESCE(SUM(sa.new_followers), 0) AS followers,
        COALESCE(COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'active'), 0) AS subscribers,
        COALESCE(SUM(sa.donations), 0) AS donations,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'succeeded'), 0) AS revenue,
        COALESCE(AVG(sa.engagement), 0) AS engagement
      FROM streams s
      LEFT JOIN stream_analytics sa ON sa.stream_id = s.id AND sa.created_at >= NOW() - INTERVAL '${days} days'
      LEFT JOIN payment_transactions pt ON pt.user_id = s.user_id AND pt.created_at >= NOW() - INTERVAL '${days} days'
      LEFT JOIN user_subscriptions us ON us.user_id = s.user_id
      WHERE s.user_id = $1
      GROUP BY COALESCE(s.platform, 'unknown')
      ORDER BY viewers DESC
    `,
      [sessionState.userId],
    )

    const colors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]
    const platforms = rows.map((row, index) => ({
      platform: String(row.platform ?? "unknown"),
      viewers: Number(row.viewers ?? 0),
      chatMessages: Number(row.chat_messages ?? 0),
      followers: Number(row.followers ?? 0),
      subscribers: Number(row.subscribers ?? 0),
      donations: Number(row.donations ?? 0),
      revenue: Number(row.revenue ?? 0),
      engagement: Number(row.engagement ?? 0),
      color: colors[index % colors.length],
    }))

    return NextResponse.json({ platforms })
  } catch (error) {
    console.error("Platform analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function periodToDays(period: "24h" | "7d" | "30d" | "90d" | "1y") {
  switch (period) {
    case "24h":
      return 1
    case "30d":
      return 30
    case "90d":
      return 90
    case "1y":
      return 365
    case "7d":
    default:
      return 7
  }
}
