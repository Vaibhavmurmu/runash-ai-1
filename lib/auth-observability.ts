type AuthMetricName =
  | "auth.login.attempt"
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.session.created"
  | "auth.session.revoked"
  | "auth.session.invalidated"
  | "auth.session.rotation_due"
  | "auth.session.refresh"
  | "auth.account_link.allowed"
  | "auth.account_link.denied"
  | "auth.rate_limited"
  | "auth.suspicious_activity"
  | "auth.forbidden.action"
  | "auth.permission.abuse"
  | "admin.operation.executed"
  | "admin.role.changed"
  | "admin.permission.granted"
  | "admin.permission.revoked"

type AuthSecurityMetricsWindow = {
  failedAuth: number
  forbiddenAccess: number
  sessionRevokes: number
}

export type AuthMetricCategory = "authentication" | "authorization" | "session" | "admin" | "security_alert"
export type AlertCategory = "suspicious_login_behavior" | "permission_abuse"

type AuthMetricPoint = {
  name: AuthMetricName
  category: AuthMetricCategory
  value: number
  tags?: Record<string, string | number | boolean>
  alertCategory?: AlertCategory
  timestamp: string
}

const metricBuffer: AuthMetricPoint[] = []
const MAX_METRICS = 1000
const SENSITIVE_TAG_PATTERN = /(token|secret|password|credential|authorization|cookie|email|card|cvv|otp|session|refresh|payload|auth|payment)/i

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

function getMetricCategory(name: AuthMetricName): AuthMetricCategory {
  if (name.startsWith("admin.")) return "admin"
  if (name.startsWith("auth.session.")) return "session"
  if (name === "auth.forbidden.action" || name === "auth.permission.abuse") return "authorization"
  if (name.includes("suspicious") || name.includes("abuse")) return "security_alert"
  return "authentication"
}

function getAlertCategory(name: AuthMetricName): AlertCategory | undefined {
  if (name === "auth.suspicious_activity") return "suspicious_login_behavior"
  if (name === "auth.permission.abuse") return "permission_abuse"
  return undefined
}

function countRecentMatchingMetrics(name: AuthMetricName, tagKey: string, tagValue: string, withinMinutes: number) {
  const cutoff = Date.now() - withinMinutes * 60 * 1000
  return metricBuffer.filter(
    (metric) => metric.name === name && metric.tags?.[tagKey] === tagValue && new Date(metric.timestamp).getTime() >= cutoff,
  ).length
}

export function recordAuthMetric(name: AuthMetricName, tags?: Record<string, string | number | boolean>, value = 1) {
  const safeTags = sanitizeTags(tags)

  if (name === "auth.login.failed") {
    const fingerprint = String(safeTags?.principalFingerprint ?? "unknown")
    if (countRecentMatchingMetrics("auth.login.failed", "principalFingerprint", fingerprint, 10) >= 4) {
      recordAuthMetric("auth.suspicious_activity", {
        reason: "repeated_login_failures",
        principalFingerprint: fingerprint,
      })
    }
  }

  const metricPoint: AuthMetricPoint = {
    name,
    category: getMetricCategory(name),
    value,
    tags: safeTags,
    alertCategory: getAlertCategory(name),
    timestamp: new Date().toISOString(),
  }

  metricBuffer.unshift(metricPoint)

  if (metricBuffer.length > MAX_METRICS) {
    metricBuffer.length = MAX_METRICS
  }

  console.info("[metrics.auth]", JSON.stringify(metricPoint))
}

export function getAuthMetricsSnapshot(limit = 100) {
  return metricBuffer.slice(0, limit)
}

export function getAuthSecurityDashboardData(windowMinutes = 24 * 60) {
  const now = Date.now()
  const windowStart = now - windowMinutes * 60 * 1000
  const windowedMetrics = metricBuffer.filter((metric) => new Date(metric.timestamp).getTime() >= windowStart)

  const authSuccesses = windowedMetrics.filter((metric) => metric.name === "auth.login.success").length
  const authFailures = windowedMetrics.filter((metric) => metric.name === "auth.login.failed").length
  const forbiddenActions = windowedMetrics.filter((metric) => metric.name === "auth.forbidden.action").length
  const sessionInvalidations = windowedMetrics.filter((metric) => metric.name === "auth.session.invalidated").length
  const suspiciousActivity = windowedMetrics.filter((metric) => metric.name === "auth.suspicious_activity").length
  const permissionAbuse = windowedMetrics.filter((metric) => metric.name === "auth.permission.abuse").length
  const adminOperations = windowedMetrics.filter((metric) => metric.name.startsWith("admin.")).length

  return {
    windowMinutes,
    totals: {
      authSuccesses,
      authFailures,
      forbiddenActions,
      sessionInvalidations,
      suspiciousActivity,
      permissionAbuse,
      adminOperations,
    },
    alertCategories: {
      suspicious_login_behavior: suspiciousActivity,
      permission_abuse: permissionAbuse,
    },
    byCategory: {
      authentication: windowedMetrics.filter((metric) => metric.category === "authentication").length,
      authorization: windowedMetrics.filter((metric) => metric.category === "authorization").length,
      session: windowedMetrics.filter((metric) => metric.category === "session").length,
      admin: windowedMetrics.filter((metric) => metric.category === "admin").length,
      security_alert: windowedMetrics.filter((metric) => metric.category === "security_alert").length,
    },
    recentMetrics: windowedMetrics.slice(0, 200),
  }
}

function getMetricsWindow(windowMinutes: number, offsetWindows = 0): AuthSecurityMetricsWindow {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const windowEnd = now - offsetWindows * windowMs
  const windowStart = windowEnd - windowMs

  const windowedMetrics = metricBuffer.filter((metric) => {
    const timestamp = new Date(metric.timestamp).getTime()
    return timestamp >= windowStart && timestamp < windowEnd
  })

  return {
    failedAuth: windowedMetrics.filter((metric) => metric.name === "auth.login.failed").length,
    forbiddenAccess: windowedMetrics.filter((metric) => metric.name === "auth.forbidden.action").length,
    sessionRevokes: windowedMetrics.filter((metric) => metric.name === "auth.session.revoked").length,
  }
}

function calculateSpike(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }

  return Number((((current - previous) / previous) * 100).toFixed(2))
}

export function getAuthSecurityHealthMetrics(windowMinutes = 60) {
  const currentWindow = getMetricsWindow(windowMinutes, 0)
  const previousWindow = getMetricsWindow(windowMinutes, 1)

  const configuredThresholds = {
    failedAuth: 20,
    forbiddenAccess: 15,
    sessionRevokes: 25,
    spikePercent: 200,
  }

  const spikes = {
    failedAuth: calculateSpike(currentWindow.failedAuth, previousWindow.failedAuth),
    forbiddenAccess: calculateSpike(currentWindow.forbiddenAccess, previousWindow.forbiddenAccess),
    sessionRevokes: calculateSpike(currentWindow.sessionRevokes, previousWindow.sessionRevokes),
  }

  const alerts = [
    {
      metric: "failedAuth",
      severity: currentWindow.failedAuth >= configuredThresholds.failedAuth || spikes.failedAuth >= configuredThresholds.spikePercent ? "high" : "normal",
      triggered: currentWindow.failedAuth >= configuredThresholds.failedAuth || spikes.failedAuth >= configuredThresholds.spikePercent,
      reason:
        currentWindow.failedAuth >= configuredThresholds.failedAuth
          ? "failed_auth_threshold_exceeded"
          : spikes.failedAuth >= configuredThresholds.spikePercent
            ? "failed_auth_spike_detected"
            : "within_threshold",
    },
    {
      metric: "forbiddenAccess",
      severity:
        currentWindow.forbiddenAccess >= configuredThresholds.forbiddenAccess || spikes.forbiddenAccess >= configuredThresholds.spikePercent
          ? "high"
          : "normal",
      triggered:
        currentWindow.forbiddenAccess >= configuredThresholds.forbiddenAccess || spikes.forbiddenAccess >= configuredThresholds.spikePercent,
      reason:
        currentWindow.forbiddenAccess >= configuredThresholds.forbiddenAccess
          ? "forbidden_access_threshold_exceeded"
          : spikes.forbiddenAccess >= configuredThresholds.spikePercent
            ? "forbidden_access_spike_detected"
            : "within_threshold",
    },
    {
      metric: "sessionRevokes",
      severity:
        currentWindow.sessionRevokes >= configuredThresholds.sessionRevokes || spikes.sessionRevokes >= configuredThresholds.spikePercent
          ? "medium"
          : "normal",
      triggered: currentWindow.sessionRevokes >= configuredThresholds.sessionRevokes || spikes.sessionRevokes >= configuredThresholds.spikePercent,
      reason:
        currentWindow.sessionRevokes >= configuredThresholds.sessionRevokes
          ? "session_revoke_threshold_exceeded"
          : spikes.sessionRevokes >= configuredThresholds.spikePercent
            ? "session_revoke_spike_detected"
            : "within_threshold",
    },
  ]

  return {
    windowMinutes,
    counters: currentWindow,
    previousWindow,
    spikes,
    thresholds: configuredThresholds,
    alerts,
  }
}


export type MonitoringVisibility = "viewer" | "operator" | "admin"

export function getScopedAuthMonitoringData(visibility: MonitoringVisibility, windowMinutes = 24 * 60) {
  const dashboard = getAuthSecurityDashboardData(windowMinutes)

  if (visibility === "viewer") {
    return {
      visibility,
      dashboard: {
        windowMinutes: dashboard.windowMinutes,
        totals: {
          authSuccesses: dashboard.totals.authSuccesses,
          authFailures: dashboard.totals.authFailures,
          forbiddenActions: dashboard.totals.forbiddenActions,
          suspiciousActivity: dashboard.totals.suspiciousActivity,
          permissionAbuse: dashboard.totals.permissionAbuse,
        },
        alertCategories: dashboard.alertCategories,
      },
    }
  }

  if (visibility === "operator") {
    return {
      visibility,
      dashboard: {
        ...dashboard,
        recentMetrics: dashboard.recentMetrics.map((metric) => ({
          name: metric.name,
          category: metric.category,
          value: metric.value,
          alertCategory: metric.alertCategory,
          timestamp: metric.timestamp,
        })),
      },
    }
  }

  return {
    visibility,
    dashboard,
    realtimeMetrics: getAuthMetricsSnapshot(200),
  }
}
