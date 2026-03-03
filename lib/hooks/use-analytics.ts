"use client"

import { useEffect, useMemo, useState } from "react"
import { AnalyticsService } from "@/lib/analytics-service"
import type { AnalyticsDaily, Totals, UUID } from "@/lib/types"

const analyticsService = AnalyticsService.getInstance()

function mapDaysToPeriod(days: number): "24h" | "7d" | "30d" | "90d" | "1y" {
  if (days <= 1) return "24h"
  if (days <= 7) return "7d"
  if (days <= 30) return "30d"
  if (days <= 90) return "90d"
  return "1y"
}

export function useAnalytics(_userId?: UUID, days = 30) {
  const [dailyAnalytics, setDaily] = useState<AnalyticsDaily[]>([])
  const [totals, setTotals] = useState<Totals>({ revenue: 0, viewers: 0, streams: 0, engagement: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const period = mapDaysToPeriod(days)

    Promise.all([analyticsService.getOverviewAnalytics(period), analyticsService.getHistoricalAnalytics(period)])
      .then(([overview, historical]) => {
        if (!mounted) return

        const mappedDaily = historical.viewerCounts.map((entry, index): AnalyticsDaily => ({
          id: `${entry.timestamp}-${index}` as UUID,
          user_id: "session-user" as UUID,
          date: String(entry.timestamp),
          total_streams: 0,
          total_viewers: entry.value,
          total_revenue: historical.revenue[index]?.value ?? 0,
          total_orders: 0,
          avg_engagement_rate: historical.engagement[index]?.value ?? 0,
          top_product_id: null,
          created_at: new Date().toISOString(),
        }))

        setDaily(mappedDaily)
        setTotals({
          revenue: overview.revenue,
          viewers: overview.totalViews,
          streams: 0,
          engagement: overview.engagementRate,
        })
      })
      .catch((e) => {
        if (mounted) setError(String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [days])

  const getTotalRevenue = useMemo(() => () => totals.revenue, [totals.revenue])
  const getTotalViewers = useMemo(() => () => totals.viewers, [totals.viewers])

  return { dailyAnalytics, totals, getTotalRevenue, getTotalViewers, loading, error }
}
