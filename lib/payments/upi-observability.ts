type UpiMetricName =
  | "upi.request.failure"
  | "upi.provider.timeout"
  | "upi.callback.verification_failure"

type UpiMetricPoint = {
  name: UpiMetricName
  route: string
  traceId: string
  timestamp: number
}

const metricBuffer: UpiMetricPoint[] = []
const MAX_POINTS = 2000
const ALERT_WINDOW_MS = 5 * 60_000

const thresholds = {
  failureSpike5m: 15,
  timeoutRate5m: 8,
  callbackVerificationFailures5m: 5,
}

function record(point: UpiMetricPoint) {
  metricBuffer.unshift(point)
  if (metricBuffer.length > MAX_POINTS) {
    metricBuffer.length = MAX_POINTS
  }

  console.info("[metrics.upi]", JSON.stringify({
    metric: point.name,
    route: point.route,
    traceId: point.traceId,
    timestamp: new Date(point.timestamp).toISOString(),
  }))

  evaluateAlerts(point.timestamp)
}

function countInWindow(name: UpiMetricName, now: number) {
  const cutoff = now - ALERT_WINDOW_MS
  return metricBuffer.filter((metric) => metric.name === name && metric.timestamp >= cutoff).length
}

function evaluateAlerts(now: number) {
  const failureCount = countInWindow("upi.request.failure", now)
  const timeoutCount = countInWindow("upi.provider.timeout", now)
  const callbackFailures = countInWindow("upi.callback.verification_failure", now)

  if (failureCount >= thresholds.failureSpike5m) {
    console.warn("[alerts.upi]", JSON.stringify({ alert: "upi.failure_spike", threshold: thresholds.failureSpike5m, value: failureCount }))
  }

  if (timeoutCount >= thresholds.timeoutRate5m) {
    console.warn("[alerts.upi]", JSON.stringify({ alert: "upi.timeout_rate", threshold: thresholds.timeoutRate5m, value: timeoutCount }))
  }

  if (callbackFailures >= thresholds.callbackVerificationFailures5m) {
    console.warn(
      "[alerts.upi]",
      JSON.stringify({
        alert: "upi.callback_verification_failure_spike",
        threshold: thresholds.callbackVerificationFailures5m,
        value: callbackFailures,
      }),
    )
  }
}

export function recordUpiFailureMetric(route: string, traceId: string) {
  record({ name: "upi.request.failure", route, traceId, timestamp: Date.now() })
}

export function recordUpiTimeoutMetric(route: string, traceId: string) {
  record({ name: "upi.provider.timeout", route, traceId, timestamp: Date.now() })
}

export function recordUpiCallbackVerificationFailureMetric(route: string, traceId: string) {
  record({ name: "upi.callback.verification_failure", route, traceId, timestamp: Date.now() })
}

export function getUpiAlertThresholds() {
  return { ...thresholds }
}
