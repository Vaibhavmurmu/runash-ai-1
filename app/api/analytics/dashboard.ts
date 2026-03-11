import type { NextApiRequest, NextApiResponse } from "next"
import { parseOptionalStreamId, parsePeriod, requireAnalyticsSession } from "@/app/api/analytics/_lib"
import { getDashboardDataFromSql, getHistoricalSeries, getOverviewStats } from "@/lib/services/analytics-dashboard"

/**
 * GET /api/analytics/dashboard
 * Legacy consolidated endpoint maintained for backward compatibility.
 * Data is sourced from the same SQL-backed analytics services as
 * /api/analytics/overview and /api/analytics/historical.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sessionState = await requireAnalyticsSession()
    if ("error" in sessionState) {
      const payload = await sessionState.error.json()
      return res.status(sessionState.error.status).json(payload)
    }

    const searchParams = new URLSearchParams(req.query as Record<string, string>)
    const periodState = parsePeriod(searchParams)
    if (!periodState.ok) {
      const payload = await periodState.response.json()
      return res.status(periodState.response.status).json(payload)
    }

    const streamState = parseOptionalStreamId(searchParams)
    if (!streamState.ok) {
      const payload = await streamState.response.json()
      return res.status(streamState.response.status).json(payload)
    }

    const [dashboard, overview, historical] = await Promise.all([
      getDashboardDataFromSql({ userId: sessionState.userId }),
      getOverviewStats({ userId: sessionState.userId, period: periodState.period, streamId: streamState.streamId }),
      getHistoricalSeries({ userId: sessionState.userId, period: periodState.period, streamId: streamState.streamId }),
    ])

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120")
    res.status(200).json({ ...dashboard, stats: overview, historical })
  } catch (err) {
    console.error("dashboard error", err)
    res.status(500).json({ error: "failed to load dashboard data" })
  }
}
