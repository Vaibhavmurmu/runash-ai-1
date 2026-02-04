import type { AnalyticsDaily, Totals, UUID } from "@/lib/types"
import { sql } from "@/lib/db"

export async function getDailyAnalytics(userId: UUID, days = 30): Promise<AnalyticsDaily[]> {
  return sql<AnalyticsDaily[]>`
    select * from analytics_daily
    where user_id=${userId}
      and date >= (current_date - ${days}::int)
    order by date asc
  `
}

export async function getTotals(userId: UUID, days = 30): Promise<Totals> {
  const rows = await sql<{ revenue: number; viewers: number; streams: number; engagement: number }[]>`
    select
      coalesce(sum(total_revenue),0)::float8 as revenue,
      coalesce(sum(total_viewers),0)::int as viewers,
      coalesce(sum(total_streams),0)::int as streams,
      coalesce(avg(avg_engagement_rate),0)::float8 as engagement
    from analytics_daily
    where user_id=${userId} and date >= (current_date - ${days}::int)
  `
  return rows[0] ?? { revenue: 0, viewers: 0, streams: 0, engagement: 0 }
}
