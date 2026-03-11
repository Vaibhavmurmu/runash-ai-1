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

    const [totals] = await Database.query<{ total_revenue: string | number | null }>(
      `
      SELECT COALESCE(SUM(pt.amount), 0) AS total_revenue
      FROM payment_transactions pt
      WHERE pt.user_id = $1
        AND pt.status = 'succeeded'
        AND pt.created_at >= NOW() - INTERVAL '${days} days'
    `,
      [sessionState.userId],
    )

    const revenueBySource = await Database.query<{ source: string | null; amount: string | number | null }>(
      `
      SELECT
        COALESCE(pt.payment_method, 'unknown') AS source,
        COALESCE(SUM(pt.amount), 0) AS amount
      FROM payment_transactions pt
      WHERE pt.user_id = $1
        AND pt.status = 'succeeded'
        AND pt.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(pt.payment_method, 'unknown')
      ORDER BY amount DESC
    `,
      [sessionState.userId],
    )

    const revenueTimeline = await Database.query<{ date: string; amount: string | number | null }>(
      `
      SELECT
        DATE(pt.created_at) AS date,
        COALESCE(SUM(pt.amount), 0) AS amount
      FROM payment_transactions pt
      WHERE pt.user_id = $1
        AND pt.status = 'succeeded'
        AND pt.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(pt.created_at)
      ORDER BY date ASC
    `,
      [sessionState.userId],
    )

    const topEarningStreams = await Database.query<{
      stream_id: string | null
      title: string | null
      revenue: string | number | null
    }>(
      `
      SELECT
        s.id::text AS stream_id,
        s.title,
        COALESCE(SUM(sa.donations), 0) AS revenue
      FROM streams s
      LEFT JOIN stream_analytics sa ON sa.stream_id = s.id
      WHERE s.user_id = $1
        AND sa.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY s.id, s.title
      ORDER BY revenue DESC
      LIMIT 5
    `,
      [sessionState.userId],
    )

    const totalRevenue = Number(totals?.total_revenue ?? 0)

    return NextResponse.json({
      totalRevenue,
      revenueBySource: revenueBySource.map((entry) => {
        const amount = Number(entry.amount ?? 0)
        const percentage = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 10000) / 100 : 0
        return {
          source: String(entry.source ?? "unknown"),
          amount,
          percentage,
        }
      }),
      revenueTimeline: revenueTimeline.map((entry) => ({
        timestamp: String(entry.date),
        value: Number(entry.amount ?? 0),
      })),
      topEarningStreams: topEarningStreams.map((entry) => ({
        streamId: String(entry.stream_id ?? ""),
        title: String(entry.title ?? "Untitled stream"),
        revenue: Number(entry.revenue ?? 0),
      })),
    })
  } catch (error) {
    console.error("Revenue analytics error:", error)
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
