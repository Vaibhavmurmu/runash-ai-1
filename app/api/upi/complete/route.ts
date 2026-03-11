import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit"
import { logApiEvent } from "@/lib/api/logging"
import { recordUpiCallbackVerificationFailureMetric, recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { isValidTransactionId, resolveIdempotencyKey, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"
import { isUpiSandboxCompleteEnabled } from "@/lib/upi-feature-flags"

const COMPLETE_RATE_LIMIT = 20
const COMPLETE_WINDOW_MS = 60_000
const COMPLETE_USER_RATE_LIMIT = 10
const COMPLETE_TX_RATE_LIMIT = 8

export async function POST(request: NextRequest) {
  const traceId = resolveTraceId(request)

  if (!isUpiSandboxCompleteEnabled()) {
    return NextResponse.json({ error: "Sandbox completion is disabled. Provider callback verification is required.", errorCode: "RISK_BLOCKED" }, { status: 403 })
  }

  const limiter = await rateLimit(request, "upi:complete", COMPLETE_RATE_LIMIT, COMPLETE_WINDOW_MS)
  if (!limiter.success) {
    recordUpiFailureMetric("/api/upi/complete", traceId)
    return NextResponse.json({ error: "UPI completion is temporarily blocked due to risk controls.", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const userId = resolveUserId(request, body)
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : ""
  const idempotencyKey = resolveIdempotencyKey(request, body, "upi:complete")

  const userLimiter = await rateLimitByKey(`upi:complete:user:${userId}`, COMPLETE_USER_RATE_LIMIT, COMPLETE_WINDOW_MS)
  const txLimiter = await rateLimitByKey(`upi:complete:tx:${transactionId || "unknown"}`, COMPLETE_TX_RATE_LIMIT, COMPLETE_WINDOW_MS)
  if (!userLimiter.success || !txLimiter.success) {
    recordUpiFailureMetric("/api/upi/complete", traceId)
    return NextResponse.json({ error: "Completion rate limit exceeded", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  if (!transactionId || !isValidTransactionId(transactionId)) {
    recordUpiFailureMetric("/api/upi/complete", traceId)
    return NextResponse.json({ error: "transactionId is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const result = await UpiCheckoutService.completeViaProvider({ transactionId, idempotencyKey, userId })
  if (!result.ok) {
    recordUpiFailureMetric("/api/upi/complete", traceId)
    recordUpiCallbackVerificationFailureMetric("/api/upi/complete", traceId)
    return NextResponse.json({ error: result.error, errorCode: result.errorCode }, { status: 400 })
  }

  logApiEvent("info", "payments.upi.complete.success", {
    requestId: traceId,
    route: "/api/upi/complete",
    method: "POST",
    userId,
    details: { transactionId, status: result.status, idempotencyKey },
  })

  return NextResponse.json(result)
}
