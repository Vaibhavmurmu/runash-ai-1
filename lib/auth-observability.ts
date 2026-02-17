type AuthMetricName =
  | "auth.login.attempt"
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.session.created"
  | "auth.session.revoked"
  | "auth.session.invalidated"
  | "auth.session.rotation_due"
  | "auth.account_link.allowed"
  | "auth.account_link.denied"
  | "auth.rate_limited"
  | "auth.suspicious_activity"
  | "admin.operation.executed"
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
const SENSITIVE_TAG_PATTERN = /(token|secret|password|credential|authorization|cookie|email|card|cvv|otp|session|refresh)/i

function sanitizeTags(tags?: Record<string, string | number | boolean>) {
  if (!tags) return undefined

  const sanitizedEntries = Object.entries(tags).map(([key, value]) => {
    if (SENSITIVE_TAG_PATTERN.test(key)) {
      return [key, "[REDACTED]"]
    }

    if (typeof value === "string" && SENSITIVE_TAG_PATTERN.test(value)) {
      return [key, "[REDACTED]"]
    }

    return [key, value]
  })

  return Object.fromEntries(sanitizedEntries)
}

export function recordAuthMetric(name: AuthMetricName, tags?: Record<string, string | number | boolean>, value = 1) {
  const safeTags = sanitizeTags(tags)

  metricBuffer.unshift({
    name,
    value,
    tags: safeTags,
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
      tags: safeTags,
      timestamp: metricBuffer[0].timestamp,
    }),
  )
}

export function getAuthMetricsSnapshot(limit = 100) {
  return metricBuffer.slice(0, limit)
}

export function getAuthSecurityDashboardData(windowMinutes = 24 * 60) {
  const now = Date.now()
  const windowStart = now - windowMinutes * 60 * 1000
  const windowedMetrics = metricBuffer.filter((metric) => new Date(metric.timestamp).getTime() >= windowStart)

  const authFailures = windowedMetrics.filter((metric) => metric.name === "auth.login.failed").length
  const suspiciousActivity = windowedMetrics.filter((metric) => metric.name === "auth.suspicious_activity").length
  const adminOperations = windowedMetrics.filter((metric) => metric.name.startsWith("admin.")).length

  return {
    windowMinutes,
    totals: {
      authFailures,
      suspiciousActivity,
      adminOperations,
    },
    recentMetrics: windowedMetrics.slice(0, 200),
  }
}
