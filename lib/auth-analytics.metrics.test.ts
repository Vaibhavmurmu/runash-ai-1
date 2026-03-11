import assert from "node:assert/strict"
import test from "node:test"

import { assembleGeographicData, computeRealTimeMetrics } from "@/lib/auth-analytics"

test("computeRealTimeMetrics derives session metrics from query rows", () => {
  const metrics = computeRealTimeMetrics({
    metricRows: [
      {
        active_users: "4",
        current_sessions: "7",
        avg_session_seconds: "150",
        peak_concurrent_users: "9",
      },
    ],
  })

  assert.deepEqual(metrics, {
    activeUsers: 4,
    currentSessions: 7,
    avgSessionDuration: 2.5,
    peakConcurrentUsers: 9,
  })
})

test("computeRealTimeMetrics returns zero metrics for empty dataset", () => {
  const metrics = computeRealTimeMetrics({ metricRows: [] })

  assert.deepEqual(metrics, {
    activeUsers: 0,
    currentSessions: 0,
    avgSessionDuration: 0,
    peakConcurrentUsers: 0,
  })
})

test("assembleGeographicData computes percentages and country fallback", () => {
  const metrics = assembleGeographicData([
    { country: "India", logins: "5" },
    { country: "", logins: 3 },
  ])

  assert.deepEqual(metrics, [
    { country: "India", logins: 5, percentage: 62.5 },
    { country: "Unknown", logins: 3, percentage: 37.5 },
  ])
})

test("assembleGeographicData returns empty list for absent enrichment rows", () => {
  assert.deepEqual(assembleGeographicData([]), [])
})
