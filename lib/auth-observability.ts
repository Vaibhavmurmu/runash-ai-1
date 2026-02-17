type AuthMetricName =
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.session.invalidated"
  | "auth.session.rotation_due"
  | "auth.account_link.allowed"
  | "auth.account_link.denied"
  | "auth.rate_limited"
  | "auth.suspicious_activity"
  | "admin.role.changed"
  | "admin.permission.granted"
  | "admin.permission.revoked"

type AuthMetricPoint = {
  name: AuthMetricName
  value: number
  tags?: Record<string, string | number | boolean>
  timestamp: string
}

const metricBuffer: AuthMetricPoint[] = []
const MAX_METRICS = 1000

export function recordAuthMetric(name: AuthMetricName, tags?: Record<string, string | number | boolean>, value = 1) {
  metricBuffer.unshift({
    name,
    value,
    tags,
    timestamp: new Date().toISOString(),
  })

  if (metricBuffer.length > MAX_METRICS) {
    metricBuffer.length = MAX_METRICS
  }

  console.info(
    "[metrics.auth]",
    JSON.stringify({
      name,
      value,
      tags,
      timestamp: metricBuffer[0].timestamp,
    }),
  )
}

export function getAuthMetricsSnapshot(limit = 100) {
  return metricBuffer.slice(0, limit)
}

