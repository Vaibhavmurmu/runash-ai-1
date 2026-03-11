import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/neon"
import { parseOptionalStreamId, parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"
import { computePercentChange, getPeriodBounds } from "./change"

type AggregateRow = {
  current_total_views: number
  previous_total_views: number
  current_revenue_est: number
  previous_revenue_est: number
  current_avg_watch_time: number
  previous_avg_watch_time: number
  current_engagement: number
  previous_engagement: number
}

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
    const { previousFrom, currentFrom, currentTo } = getPeriodBounds(periodState.period)
    const streamFilter = streamState.streamId ? sql`AND s.id = ${streamState.streamId}` : sql``

    const [agg] = await sql<AggregateRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN sa.created_at >= ${currentFrom} AND sa.created_at < ${currentTo} THEN sa.total_views ELSE 0 END), 0)::int AS current_total_views,
        COALESCE(SUM(CASE WHEN sa.created_at >= ${previousFrom} AND sa.created_at < ${currentFrom} THEN sa.total_views ELSE 0 END), 0)::int AS previous_total_views,
        COALESCE(SUM(CASE WHEN sa.created_at >= ${currentFrom} AND sa.created_at < ${currentTo} THEN sa.donations ELSE 0 END), 0)::int AS current_revenue_est,
        COALESCE(SUM(CASE WHEN sa.created_at >= ${previousFrom} AND sa.created_at < ${currentFrom} THEN sa.donations ELSE 0 END), 0)::int AS previous_revenue_est,
        COALESCE(AVG(CASE WHEN sa.created_at >= ${currentFrom} AND sa.created_at < ${currentTo} THEN sa.watch_time END), 0)::numeric AS current_avg_watch_time,
        COALESCE(AVG(CASE WHEN sa.created_at >= ${previousFrom} AND sa.created_at < ${currentFrom} THEN sa.watch_time END), 0)::numeric AS previous_avg_watch_time,
        COALESCE(AVG(CASE WHEN sa.created_at >= ${currentFrom} AND sa.created_at < ${currentTo} THEN sa.engagement END), 0)::numeric AS current_engagement,
        COALESCE(AVG(CASE WHEN sa.created_at >= ${previousFrom} AND sa.created_at < ${currentFrom} THEN sa.engagement END), 0)::numeric AS previous_engagement
      FROM public.streams s
      LEFT JOIN public.stream_analytics sa ON sa.stream_id = s.id
      WHERE s.user_id = ${sessionState.userId}
        ${streamFilter}
    `

    const totalViews = Number(agg?.current_total_views ?? 0)
    const revenue = Number(agg?.current_revenue_est ?? 0)
    const avgWatchTimeSeconds = Number(agg?.current_avg_watch_time ?? 0)
    const engagementRate = Number(agg?.current_engagement ?? 0)

    const stats = {
      totalViews,
      revenue,
      avgWatchTimeSeconds,
      engagementRate,
      change: {
        views: computePercentChange(totalViews, Number(agg?.previous_total_views ?? 0)),
        revenue: computePercentChange(revenue, Number(agg?.previous_revenue_est ?? 0)),
        watch: computePercentChange(avgWatchTimeSeconds, Number(agg?.previous_avg_watch_time ?? 0)),
        engagement: computePercentChange(engagementRate, Number(agg?.previous_engagement ?? 0)),
      },
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
