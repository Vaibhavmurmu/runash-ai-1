"use client"

import { useEffect, useMemo, useState } from "react"
import type { DashboardWidget } from "@/types/custom-dashboard"
import type { WidgetAnalyticsPoint, WidgetAnalyticsResponse } from "@/types/analytics"

type State = {
  isLoading: boolean
  error: string | null
  series: WidgetAnalyticsPoint[]
}

function mapMetric(metric: string | undefined): WidgetAnalyticsResponse["metric"] {
  switch (metric) {
    case "streams":
      return "streams"
    case "live_streams":
      return "live_streams"
    case "avg_viewers":
      return "avg_viewers"
    case "viewers":
    default:
      return "viewer_count"
  }
}

export function useWidgetAnalytics(widget: DashboardWidget) {
  const [state, setState] = useState<State>({ isLoading: true, error: null, series: [] })

  const query = useMemo(() => {
    const metric = mapMetric(widget.config.metric)
    const period = widget.config.timeRange?.preset === "today" ? "24h" : "7d"
    const dimensions = widget.type === "pie-chart" ? ["status"] : ["day"]
    const params = new URLSearchParams({ metric, period, dimensions: dimensions.join(",") })
    return params.toString()
  }, [widget.config.metric, widget.config.timeRange?.preset, widget.type])

  useEffect(() => {
    let cancelled = false
    setState({ isLoading: true, error: null, series: [] })

    fetch(`/api/analytics?${query}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as WidgetAnalyticsResponse | { error?: { message?: string } } | null
        if (!res.ok) {
          const msg = body && typeof body === "object" && "error" in body ? body.error?.message : `Analytics request failed (${res.status}).`
          throw new Error(msg || "Analytics request failed")
        }
        if (!body || typeof body !== "object" || !("series" in body) || !Array.isArray(body.series)) {
          throw new Error("Analytics response missing series data.")
        }

        if (!cancelled) {
          setState({ isLoading: false, error: null, series: body.series.filter((item) => item && typeof item.value === "number") })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load widget analytics"
          setState({ isLoading: false, error: message, series: [] })
        }
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return state
}
