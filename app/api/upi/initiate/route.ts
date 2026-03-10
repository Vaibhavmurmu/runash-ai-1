import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { logApiEvent } from "@/lib/api/logging"
import { recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { rateLimitByKey } from "@/lib/rate-limit"
import { resolveIdempotencyKey, resolveTraceId, resolveUserId, validateAmountBounds, validateUpiId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const INITIATE_RATE_LIMIT = 20
const INITIATE_WINDOW_MS = 60_000
const INITIATE_USER_RATE_LIMIT = 10

export async function POST(request: NextRequest) {
  const traceId = resolveTraceId(request)
  const payload = await request.json().catch(() => ({}))
  const userId = resolveUserId(request, payload)
  const limiter = await rateLimit(request, "upi:initiate", INITIATE_RATE_LIMIT, INITIATE_WINDOW_MS)
  const userLimiter = await rateLimitByKey(`upi:initiate:user:${userId}`, INITIATE_USER_RATE_LIMIT, INITIATE_WINDOW_MS)

  if (!limiter.success || !userLimiter.success) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json(
      {
        error: "Too many payment initiation attempts. Please wait and retry.",
        errorCode: "RISK_BLOCKED",
      },
      { status: 429 },
    )
  }

  const payerUpiId = validateUpiId(payload?.upiId)
  const amount = validateAmountBounds(payload?.amount)
  if (amount == null) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json(
      {
        error: "amount must be within allowed UPI bounds",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }

  if (!payerUpiId) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "upiId is required and must be valid", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const idempotencyKey = resolveIdempotencyKey(request, payload, "upi-init")
  logApiEvent("info", "payments.upi.initiate.request", {
    requestId: traceId,
    route: "/api/upi/initiate",
    method: "POST",
    userId,
    details: { amount, idempotencyKey, payerUpiHandle: payerUpiId.split("@")[1] },
  })
  const initiated = UpiCheckoutService.initiatePayment({ idempotencyKey, amount, payerUpiId, userId })

  logApiEvent("info", "payments.upi.initiate.success", {
    requestId: traceId,
    route: "/api/upi/initiate",
    method: "POST",
    userId,
    details: { amount: initiated.amount, transactionId: initiated.transactionId, idempotencyKey: initiated.idempotencyKey },
  })

  return NextResponse.json(initiated)
}
