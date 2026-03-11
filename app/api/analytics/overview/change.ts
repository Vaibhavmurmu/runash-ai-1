import type { AnalyticsPeriod } from "@/app/api/analytics/_lib"

const PERIOD_TO_MS: Record<AnalyticsPeriod, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
}

export function getPeriodBounds(period: AnalyticsPeriod, now = new Date()) {
  const durationMs = PERIOD_TO_MS[period]
  const currentFrom = new Date(now.getTime() - durationMs)
  const previousFrom = new Date(currentFrom.getTime() - durationMs)

  return { previousFrom, currentFrom, currentTo: now }
}

export function computePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0
    return current > 0 ? 100 : -100
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}
