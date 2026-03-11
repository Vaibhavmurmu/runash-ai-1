import type { AnalyticsPeriod } from "@/app/api/analytics/_lib"
import { getSql } from "@/lib/db"

type SqlClient = ReturnType<typeof getSql>

export type OverviewStats = {
  totalViews: number
  revenue: number
  avgWatchTimeSeconds: number
  engagementRate: number
  change: { views: number; revenue: number; watch: number; engagement: number }
}

export type TimeSeriesPoint = { timestamp: string; value: number }

export type HistoricalSeries = {
  viewerCounts: TimeSeriesPoint[]
  chatActivity: TimeSeriesPoint[]
  followerGrowth: TimeSeriesPoint[]
  revenue: TimeSeriesPoint[]
  engagement: TimeSeriesPoint[]
  watchTime: TimeSeriesPoint[]
}

export type DashboardResponse = {
  overview: Array<{ date: string; viewers: number; followers: number; revenue: number }>
  platforms: Array<{ name: string; value: number; color: string }>
  content: Array<{ name: string; views: number; engagement: number }>
  audience: Array<{ name: string; male: number; female: number }>
  revenue: Array<{ name: string; value: number; color: string }>
  engagement: Array<{ time: string; chatActivity: number; viewers: number }>
}

const PLATFORM_COLORS: Record<string, string> = {
  twitch: "#9146FF",
  youtube: "#FF0000",
  facebook: "#1877F2",
  tiktok: "#000000",
  default: "#6B7280",
}

const REVENUE_COLORS = ["#3b82f6", "#f97316", "#84cc16", "#8b5cf6", "#06b6d4"]

function periodDays(period: AnalyticsPeriod): number {
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

export function getPeriodStart(period: AnalyticsPeriod, now = new Date()) {
  return new Date(now.getTime() - periodDays(period) * 24 * 60 * 60 * 1000)
}

export async function getOverviewStats(params: {
  userId: string
  period: AnalyticsPeriod
  streamId?: string
  sqlClient?: SqlClient
}): Promise<OverviewStats> {
  const sql = params.sqlClient ?? getSql()
  const from = getPeriodStart(params.period)
  const streamFilter = params.streamId ? sql`AND s.id = ${params.streamId}` : sql``

  const [agg] = await sql<{ total_views: number; revenue_est: number; avg_watch_time: number; engagement: number }[]>`
    SELECT
      COALESCE(SUM(sa.total_views), 0)::int AS total_views,
      COALESCE(SUM(sa.donations), 0)::int AS revenue_est,
      COALESCE(AVG(sa.watch_time), 0)::numeric AS avg_watch_time,
      COALESCE(AVG(sa.engagement), 0)::numeric AS engagement
    FROM public.streams s
    LEFT JOIN public.stream_analytics sa ON sa.stream_id = s.id
    WHERE s.user_id = ${params.userId}
      ${streamFilter}
      AND sa.created_at >= ${from}
  `

  return {
    totalViews: Number(agg?.total_views ?? 0),
    revenue: Number(agg?.revenue_est ?? 0),
    avgWatchTimeSeconds: Number(agg?.avg_watch_time ?? 0),
    engagementRate: Number(agg?.engagement ?? 0),
    // Data provenance: this endpoint currently only has a single selected period in-scope.
    // We intentionally return neutral deltas until a persisted previous-period comparison table exists.
    change: { views: 0, revenue: 0, watch: 0, engagement: 0 },
  }
}

export async function getHistoricalSeries(params: {
  userId: string
  period: AnalyticsPeriod
  streamId?: string
  sqlClient?: SqlClient
}): Promise<HistoricalSeries> {
  const sql = params.sqlClient ?? getSql()
  const from = getPeriodStart(params.period)
  const streamFilter = params.streamId ? sql`AND s.id = ${params.streamId}` : sql``

  const rows = await sql<
    {
      date: string
      viewer_counts: number
      chat_activity: number
      follower_growth: number
      revenue: number
      engagement: number
      watch_time: number
    }[]
  >`
    WITH scoped_streams AS (
      SELECT s.id
      FROM public.streams s
      WHERE s.user_id = ${params.userId}
      ${streamFilter}
    ),
    analytics AS (
      SELECT
        DATE(sa.created_at) AS date,
        COALESCE(AVG(sa.average_viewers), 0)::numeric AS viewer_counts,
        COALESCE(SUM(sa.chat_messages), 0)::numeric AS chat_activity,
        COALESCE(AVG(sa.engagement), 0)::numeric AS engagement,
        COALESCE(SUM(sa.watch_time), 0)::numeric AS watch_time
      FROM public.stream_analytics sa
      JOIN scoped_streams ss ON ss.id = sa.stream_id
      WHERE sa.created_at >= ${from}
      GROUP BY DATE(sa.created_at)
    ),
    followers AS (
      SELECT DATE(uf.created_at) AS date, COUNT(*)::numeric AS follower_growth
      FROM public.user_followers uf
      WHERE uf.user_id = ${params.userId}
        AND uf.created_at >= ${from}
      GROUP BY DATE(uf.created_at)
    ),
    payments AS (
      SELECT DATE(pt.created_at) AS date, COALESCE(SUM(pt.amount), 0)::numeric AS revenue
      FROM public.payment_transactions pt
      WHERE pt.user_id = ${params.userId}
        AND pt.created_at >= ${from}
        AND pt.status = 'succeeded'
      GROUP BY DATE(pt.created_at)
    ),
    all_dates AS (
      SELECT date FROM analytics
      UNION
      SELECT date FROM followers
      UNION
      SELECT date FROM payments
    )
    SELECT
      TO_CHAR(d.date, 'YYYY-MM-DD') AS date,
      COALESCE(a.viewer_counts, 0)::float8 AS viewer_counts,
      COALESCE(a.chat_activity, 0)::float8 AS chat_activity,
      COALESCE(f.follower_growth, 0)::float8 AS follower_growth,
      COALESCE(p.revenue, 0)::float8 AS revenue,
      COALESCE(a.engagement, 0)::float8 AS engagement,
      COALESCE(a.watch_time, 0)::float8 AS watch_time
    FROM all_dates d
    LEFT JOIN analytics a ON a.date = d.date
    LEFT JOIN followers f ON f.date = d.date
    LEFT JOIN payments p ON p.date = d.date
    ORDER BY d.date
  `

  const format = (key: keyof (typeof rows)[number]) => rows.map((row) => ({ timestamp: row.date, value: Number(row[key] ?? 0) }))

  return {
    viewerCounts: format("viewer_counts"),
    chatActivity: format("chat_activity"),
    followerGrowth: format("follower_growth"),
    revenue: format("revenue"),
    engagement: format("engagement"),
    watchTime: format("watch_time"),
  }
}

export async function getDashboardDataFromSql(params: {
  userId?: string
  sqlClient?: SqlClient
}): Promise<DashboardResponse> {
  const sql = params.sqlClient ?? getSql()
  const userFilter = params.userId ? sql`WHERE s.user_id = ${params.userId}` : sql``

  // Data provenance: every block below is generated from persisted SQL tables.
  // We intentionally avoid synthetic/random fallback values to keep API responses deterministic.
  const overviewRows = await sql<{ month: string; viewers: number; followers: number; revenue: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('month', sa.created_at), 'Mon') AS month,
      COALESCE(SUM(sa.total_views), 0)::int AS viewers,
      COALESCE(SUM(sa.new_followers), 0)::int AS followers,
      COALESCE(SUM(sa.donations), 0)::int AS revenue
    FROM public.stream_analytics sa
    JOIN public.streams s ON s.id = sa.stream_id
    ${userFilter}
    GROUP BY DATE_TRUNC('month', sa.created_at)
    ORDER BY DATE_TRUNC('month', sa.created_at) DESC
    LIMIT 12
  `

  const platformRows = await sql<{ name: string; value: number }[]>`
    SELECT
      COALESCE(NULLIF(TRIM(s.platform), ''), 'Unknown')::text AS name,
      COALESCE(SUM(sa.total_views), 0)::int AS value
    FROM public.streams s
    LEFT JOIN public.stream_analytics sa ON sa.stream_id = s.id
    ${userFilter}
    GROUP BY COALESCE(NULLIF(TRIM(s.platform), ''), 'Unknown')
    ORDER BY value DESC, name ASC
    LIMIT 6
  `

  const contentRows = await sql<{ name: string; views: number; engagement: number }[]>`
    SELECT
      COALESCE(NULLIF(TRIM(s.title), ''), 'Untitled stream')::text AS name,
      COALESCE(SUM(sa.total_views), 0)::int AS views,
      COALESCE(AVG(sa.engagement), 0)::float8 AS engagement
    FROM public.streams s
    LEFT JOIN public.stream_analytics sa ON sa.stream_id = s.id
    ${userFilter}
    GROUP BY COALESCE(NULLIF(TRIM(s.title), ''), 'Untitled stream')
    ORDER BY views DESC, name ASC
    LIMIT 5
  `

  const revenueRows = await sql<{ name: string; value: number }[]>`
    SELECT
      COALESCE(NULLIF(TRIM(pt.status), ''), 'unknown')::text AS name,
      COALESCE(SUM(pt.amount), 0)::int AS value
    FROM public.payment_transactions pt
    ${params.userId ? sql`WHERE pt.user_id = ${params.userId}` : sql``}
    GROUP BY COALESCE(NULLIF(TRIM(pt.status), ''), 'unknown')
    ORDER BY value DESC, name ASC
    LIMIT 5
  `

  const engagementRows = await sql<{ hour_label: string; chat_activity: number; viewers: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('hour', sa.created_at), 'HH24:00') AS hour_label,
      COALESCE(SUM(sa.chat_messages), 0)::int AS chat_activity,
      COALESCE(AVG(sa.average_viewers), 0)::int AS viewers
    FROM public.stream_analytics sa
    JOIN public.streams s ON s.id = sa.stream_id
    ${userFilter}
    GROUP BY DATE_TRUNC('hour', sa.created_at)
    ORDER BY DATE_TRUNC('hour', sa.created_at) DESC
    LIMIT 12
  `

  return {
    overview: [...overviewRows].reverse().map((row) => ({
      date: row.month,
      viewers: Number(row.viewers ?? 0),
      followers: Number(row.followers ?? 0),
      revenue: Number(row.revenue ?? 0),
    })),
    platforms: platformRows.map((row) => ({
      name: row.name,
      value: Number(row.value ?? 0),
      color: PLATFORM_COLORS[row.name.toLowerCase()] ?? PLATFORM_COLORS.default,
    })),
    content: contentRows.map((row) => ({
      name: row.name,
      views: Number(row.views ?? 0),
      engagement: Number(row.engagement ?? 0),
    })),
    // Audience demographic bands require an identity/profile source that this analytics pipeline does not currently persist.
    // To avoid fabricating demographics, we return an empty collection until such source is available.
    audience: [],
    revenue: revenueRows.map((row, index) => ({
      name: row.name,
      value: Number(row.value ?? 0),
      color: REVENUE_COLORS[index % REVENUE_COLORS.length],
    })),
    engagement: [...engagementRows].reverse().map((row) => ({
      time: row.hour_label,
      chatActivity: Number(row.chat_activity ?? 0),
      viewers: Number(row.viewers ?? 0),
    })),
  }
}
