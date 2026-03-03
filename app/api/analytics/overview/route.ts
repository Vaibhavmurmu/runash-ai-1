import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/neon"
import { parseOptionalStreamId, parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"

export async function GET(req: Request) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      return sessionState.error
    }

    const url = new URL(req.url)
    const periodState = parsePeriod(url.searchParams)
    if (!periodState.ok) {
      return periodState.response
    }

    const streamState = parseOptionalStreamId(url.searchParams)
    if (!streamState.ok) {
      return streamState.response
    }

    const sql = getSql()
    const now = new Date()
    const from = new Date(now)
    switch (periodState.period) {
      case "24h":
        from.setDate(now.getDate() - 1)
        break
      case "30d":
        from.setDate(now.getDate() - 30)
        break
      case "90d":
        from.setDate(now.getDate() - 90)
        break
      case "1y":
        from.setDate(now.getDate() - 365)
        break
      case "7d":
      default:
        from.setDate(now.getDate() - 7)
    }

    const streamFilter = streamState.streamId ? sql`AND s.id = ${streamState.streamId}` : sql``

    const [agg] = await sql<{ total_views: number; revenue_est: number; avg_watch_time: number; engagement: number }[]>`
      SELECT
        COALESCE(SUM(sa.total_views), 0)::int AS total_views,
        COALESCE(SUM(sa.donations), 0)::int AS revenue_est,
        COALESCE(AVG(sa.watch_time), 0)::numeric AS avg_watch_time,
        COALESCE(AVG(sa.engagement), 0)::numeric AS engagement
      FROM public.streams s
      LEFT JOIN public.stream_analytics sa ON sa.stream_id = s.id
      WHERE s.user_id = ${sessionState.userId}
        ${streamFilter}
        AND s.created_at >= ${from}
    `

    const stats = {
      totalViews: Number(agg?.total_views ?? 0),
      revenue: Number(agg?.revenue_est ?? 0),
      avgWatchTimeSeconds: Number(agg?.avg_watch_time ?? 0),
      engagementRate: Number(agg?.engagement ?? 0),
      change: { views: 12, revenue: 6, watch: 3, engagement: -2 },
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
