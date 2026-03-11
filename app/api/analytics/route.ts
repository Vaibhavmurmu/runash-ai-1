import { type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import type {
  AnalyticsExportFilterContext,
  AnalyticsExportFormat,
  AnalyticsExportPayload,
  AnalyticsExportPagination,
  WidgetAnalyticsDimension,
  WidgetAnalyticsMetric,
  WidgetAnalyticsPoint,
  WidgetAnalyticsQuery,
  WidgetAnalyticsResponse,
} from "@/types/analytics"

async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

const PERIOD_TO_INTERVAL: Record<WidgetAnalyticsQuery["period"], string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
}

const ALLOWED_METRICS = new Set<WidgetAnalyticsMetric>(["viewer_count", "streams", "live_streams", "avg_viewers"])
const ALLOWED_DIMENSIONS = new Set<WidgetAnalyticsDimension>(["day", "status"])
const ALLOWED_EXPORT_FORMATS = new Set<AnalyticsExportFormat>(["csv", "json", "pdf", "image"])
const DEFAULT_EXPORT_PAGE_SIZE = 250
const MAX_EXPORT_PAGE_SIZE = 1000

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

function parseCsvFilter(value: string | null) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseExportContext(searchParams: URLSearchParams): {
  format: AnalyticsExportFormat
  filters: AnalyticsExportFilterContext
  pagination: { page: number; pageSize: number }
} {
  const requestedFormat = (searchParams.get("format") || "csv").toLowerCase()
  const format = ALLOWED_EXPORT_FORMATS.has(requestedFormat as AnalyticsExportFormat)
    ? (requestedFormat as AnalyticsExportFormat)
    : "csv"

  const period = (searchParams.get("period") || "7d") as WidgetAnalyticsQuery["period"]
  const safePeriod = period in PERIOD_TO_INTERVAL ? period : "7d"

  const page = parsePositiveInteger(searchParams.get("page"), 1)
  const pageSize = Math.min(parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_EXPORT_PAGE_SIZE), MAX_EXPORT_PAGE_SIZE)

  return {
    format,
    filters: {
      period: safePeriod,
      platforms: parseCsvFilter(searchParams.get("platforms")),
      categories: parseCsvFilter(searchParams.get("categories")),
      streamTypes: parseCsvFilter(searchParams.get("streamTypes")),
    },
    pagination: {
      page,
      pageSize,
    },
  }
}

function parseWidgetQuery(searchParams: URLSearchParams):
  | { mode: "dashboard" }
  | { mode: "widget"; metric: WidgetAnalyticsMetric; period: WidgetAnalyticsQuery["period"]; dimensions: WidgetAnalyticsDimension[] }
  | { mode: "invalid"; message: string } {
  const metricRaw = searchParams.get("metric")
  if (!metricRaw) {
    return { mode: "dashboard" }
  }

  if (!ALLOWED_METRICS.has(metricRaw as WidgetAnalyticsMetric)) {
    return { mode: "invalid", message: "Invalid metric. Expected one of: viewer_count, streams, live_streams, avg_viewers." }
  }

  const periodRaw = (searchParams.get("period") || "7d") as WidgetAnalyticsQuery["period"]
  if (!(periodRaw in PERIOD_TO_INTERVAL)) {
    return { mode: "invalid", message: "Invalid period. Expected one of: 24h, 7d, 30d, 90d, 1y." }
  }

  const dimensionsRaw = searchParams.get("dimensions")
  const dimensions = (dimensionsRaw ? dimensionsRaw.split(",") : ["day"])
    .map((value) => value.trim())
    .filter(Boolean) as WidgetAnalyticsDimension[]

  const invalidDimension = dimensions.find((dimension) => !ALLOWED_DIMENSIONS.has(dimension))
  if (invalidDimension) {
    return { mode: "invalid", message: `Invalid dimension '${invalidDimension}'. Expected: day, status.` }
  }

  return {
    mode: "widget",
    metric: metricRaw as WidgetAnalyticsMetric,
    period: periodRaw,
    dimensions: dimensions.length > 0 ? dimensions : ["day"],
  }
}

function getCreatedAtFilter(alias: string, period: WidgetAnalyticsQuery["period"]) {
  return sql`${sql.unsafe(alias)}.created_at >= NOW() - ${sql.unsafe(`INTERVAL '${PERIOD_TO_INTERVAL[period]}'`)}`
}

async function queryWidgetSeries(
  userId: string,
  metric: WidgetAnalyticsMetric,
  period: WidgetAnalyticsQuery["period"],
  dimensions: WidgetAnalyticsDimension[],
): Promise<WidgetAnalyticsPoint[]> {
  if (dimensions.includes("status") && metric === "streams") {
    const result = await sql<{ label: string; value: number }[]>`
      SELECT COALESCE(status, 'unknown')::text AS label, COUNT(*)::int AS value
      FROM streams s
      WHERE s.user_id = ${userId}
        AND ${getCreatedAtFilter("s", period)}
      GROUP BY status
      ORDER BY value DESC, label ASC
    `

    return result.map((row) => ({ label: row.label, value: Number(row.value || 0), status: row.label }))
  }

  let metricSql = sql`SUM(COALESCE(s.viewer_count, 0))::int`
  if (metric === "streams") metricSql = sql`COUNT(*)::int`
  if (metric === "live_streams") metricSql = sql`COUNT(*) FILTER (WHERE s.status = 'live')::int`
  if (metric === "avg_viewers") metricSql = sql`COALESCE(ROUND(AVG(s.viewer_count)), 0)::int`

  const result = await sql<{ label: string; value: number }[]>`
    SELECT TO_CHAR(DATE(s.created_at), 'YYYY-MM-DD') AS label, ${metricSql} AS value
    FROM streams s
    WHERE s.user_id = ${userId}
      AND ${getCreatedAtFilter("s", period)}
    GROUP BY DATE(s.created_at)
    ORDER BY DATE(s.created_at) ASC
  `

  return result.map((row) => ({ label: row.label, value: Number(row.value || 0) }))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return respondError(
        req,
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" } },
      )
    }

    const { searchParams } = new URL(req.url)
    const query = parseWidgetQuery(searchParams)
    if (query.mode === "invalid") {
      return respondError(req, { code: "INVALID_QUERY", message: query.message }, { status: 400, legacy: { error: query.message } })
    }

    if (query.mode === "widget") {
      const series = await queryWidgetSeries(session.user.id, query.metric, query.period, query.dimensions)
      const payload: WidgetAnalyticsResponse = {
        metric: query.metric,
        period: query.period,
        dimensions: query.dimensions,
        series,
      }

      return respondSuccess(req, payload, { legacy: payload })
    }

    const exportContext = parseExportContext(searchParams)

    const streamAnalytics = await sql`
      SELECT 
        COUNT(*) as total_streams,
        AVG(viewer_count) as avg_viewers,
        SUM(viewer_count) as total_views,
        COUNT(CASE WHEN status = 'live' THEN 1 END) as live_streams
      FROM streams s
      WHERE s.user_id = ${session.user.id}
      AND ${getCreatedAtFilter("s", exportContext.filters.period)}
    `

    const chatAnalytics = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT cm.user_id) as unique_chatters,
        COUNT(CASE WHEN message_type = 'donation' THEN 1 END) as donations,
        COUNT(CASE WHEN message_type = 'follow' THEN 1 END) as new_followers
      FROM chat_messages cm
      JOIN streams s ON cm.stream_id = s.id
      WHERE s.user_id = ${session.user.id}
      AND ${getCreatedAtFilter("cm", exportContext.filters.period)}
    `

    const recordingAnalytics = await sql`
      SELECT 
        COUNT(*) as total_recordings,
        SUM(duration) as total_duration,
        AVG(duration) as avg_duration,
        SUM(file_size) as total_storage
      FROM recordings r
      JOIN streams s ON r.stream_id = s.id
      WHERE s.user_id = ${session.user.id}
      AND ${getCreatedAtFilter("r", exportContext.filters.period)}
    `

    const rawDailyBreakdown = await sql`
      SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as streams,
        AVG(s.viewer_count) as avg_viewers
      FROM streams s
      WHERE s.user_id = ${session.user.id}
      AND ${getCreatedAtFilter("s", exportContext.filters.period)}
      GROUP BY DATE(s.created_at)
      ORDER BY date DESC
    `

    const totalRows = rawDailyBreakdown.length
    const totalPages = Math.max(1, Math.ceil(totalRows / exportContext.pagination.pageSize))
    const safePage = Math.min(exportContext.pagination.page, totalPages)
    const start = (safePage - 1) * exportContext.pagination.pageSize
    const end = start + exportContext.pagination.pageSize
    const paginatedRows = rawDailyBreakdown.slice(start, end)

    const pagination: AnalyticsExportPagination = {
      page: safePage,
      pageSize: exportContext.pagination.pageSize,
      totalRows,
      totalPages,
      hasNextPage: safePage < totalPages,
    }

    const analyticsPayload: AnalyticsExportPayload = {
      format: exportContext.format,
      filters: exportContext.filters,
      summary: {
        streams: streamAnalytics[0],
        chat: chatAnalytics[0],
        recordings: recordingAnalytics[0],
      },
      rows: paginatedRows,
      pagination,
    }

    const legacyPayload = {
      streams: analyticsPayload.summary.streams,
      chat: analyticsPayload.summary.chat,
      recordings: analyticsPayload.summary.recordings,
      daily: analyticsPayload.rows,
    }

    return respondSuccess(req, analyticsPayload, { legacy: legacyPayload, meta: { pagination, filters: exportContext.filters } })
  } catch {
    return respondError(
      req,
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, legacy: { error: "Internal server error" } },
    )
  }
}
