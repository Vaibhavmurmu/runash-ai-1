import assert from "node:assert/strict"
import test from "node:test"

import { computeRealTimeMetrics } from "@/lib/auth-analytics"

test("computeRealTimeMetrics derives session metrics from query rows", () => {
  const metrics = computeRealTimeMetrics({
    activeUsersRows: [{ active_users: "4" }],
    currentSessionsRows: [{ current_sessions: "7" }],
    sessionDurationRows: [{ avg_session_seconds: "150" }],
    peakConcurrentRows: [{ peak_concurrent_users: "9" }],
  })

  assert.deepEqual(metrics, {
    activeUsers: 4,
    currentSessions: 7,
    avgSessionDuration: 2.5,
    peakConcurrentUsers: 9,
  })
})

test("computeRealTimeMetrics returns unknown/null metrics for empty dataset", () => {
  const metrics = computeRealTimeMetrics({
    activeUsersRows: [],
    currentSessionsRows: [],
    sessionDurationRows: [],
    peakConcurrentRows: [],
  })

  assert.deepEqual(metrics, {
    activeUsers: 0,
    currentSessions: 0,
    avgSessionDuration: null,
    peakConcurrentUsers: null,
  })
})
