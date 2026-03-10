import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { logApiEvent } from "@/lib/api/logging"
import { recordUpiCallbackVerificationFailureMetric, recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { resolveIdempotencyKey, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { rateLimitByKey } from "@/lib/rate-limit"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const CONFIRM_RATE_LIMIT = 15
const CONFIRM_WINDOW_MS = 60_000

const CONFIRM_USER_RATE_LIMIT = 10
const CONFIRM_TX_RATE_LIMIT = 8

export async function POST(request: NextRequest) {
  const traceId = resolveTraceId(request)
  const body = await request.json().catch(() => ({}))
  const userId = resolveUserId(request, body)

  const limiter = await rateLimit(request, "upi:confirm", CONFIRM_RATE_LIMIT, CONFIRM_WINDOW_MS)

  if (!limiter.success) {
    recordUpiFailureMetric("/api/upi/confirm", traceId)
    return NextResponse.json(
      {
        error: "Confirmation is temporarily blocked due to risk controls.",
        errorCode: "RISK_BLOCKED",
      },
      { status: 429 },
    )
  }
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : ""
  const pin = typeof body?.pin === "string" ? body.pin : ""

  const userLimiter = await rateLimitByKey(`upi:confirm:user:${userId}`, CONFIRM_USER_RATE_LIMIT, CONFIRM_WINDOW_MS)
  const txLimiter = await rateLimitByKey(`upi:confirm:tx:${transactionId || "unknown"}`, CONFIRM_TX_RATE_LIMIT, CONFIRM_WINDOW_MS)
  if (!userLimiter.success || !txLimiter.success) {
    recordUpiFailureMetric("/api/upi/confirm", traceId)
    return NextResponse.json({ error: "Confirmation rate limit exceeded", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  if (!transactionId) {
    recordUpiFailureMetric("/api/upi/confirm", traceId)
    return NextResponse.json(
      {
        error: "transactionId is required",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }

  const idempotencyKey = resolveIdempotencyKey(request, body, "upi-confirm")
  const confirmation = UpiCheckoutService.confirmPayment({
    transactionId,
    pin,
    idempotencyKey,
    userId,
  })

  if (!confirmation.ok) {
    recordUpiFailureMetric("/api/upi/confirm", traceId)
    if (confirmation.code === "INVALID_PIN" || confirmation.code === "RISK_BLOCKED") {
      recordUpiCallbackVerificationFailureMetric("/api/upi/confirm", traceId)
    }
    const status = confirmation.code === "RISK_BLOCKED" ? 403 : 400
    return NextResponse.json(
      {
        error: confirmation.error,
        errorCode: confirmation.code,
        attemptsRemaining: confirmation.attemptsRemaining,
      },
      { status },
    )
  }

  logApiEvent("info", "payments.upi.confirm.success", {
    requestId: traceId,
    route: "/api/upi/confirm",
    method: "POST",
    userId,
    details: { transactionId, status: confirmation.status, idempotencyKey },
  })

  return NextResponse.json(confirmation)
}
