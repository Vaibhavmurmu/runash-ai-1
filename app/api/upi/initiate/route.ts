import { NextRequest, NextResponse } from "next/server"
import { logApiEvent } from "@/lib/api/logging"
import { recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit"
import { resolveIdempotencyKey, resolveTraceId, resolveUserId, validateAmountBounds, validateUpiId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const INITIATE_RATE_LIMIT = 20
const INITIATE_WINDOW_MS = 60_000
const INITIATE_USER_RATE_LIMIT = 10

export async function POST(request: NextRequest) {
  const traceId = resolveTraceId(request)
  const body = await request.json().catch(() => ({}))
  const userId = resolveUserId(request, body)
  const limiter = await rateLimit(request, "upi:initiate", INITIATE_RATE_LIMIT, INITIATE_WINDOW_MS)
  const userLimiter = await rateLimitByKey(`upi:initiate:user:${userId}`, INITIATE_USER_RATE_LIMIT, INITIATE_WINDOW_MS)

  if (!limiter.success || !userLimiter.success) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "Too many payment initiation attempts. Please wait and retry.", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  const amount = validateAmountBounds((body as { amount?: unknown }).amount)
  const rawOrderId = (body as { orderId?: unknown; order_id?: unknown })?.orderId ?? (body as { order_id?: unknown })?.order_id
  const orderId = typeof rawOrderId === "number" && Number.isFinite(rawOrderId) && rawOrderId > 0 ? rawOrderId : null
  const payerUpiId = validateUpiId((body as { upiId?: unknown; payerUpiId?: unknown }).upiId ?? (body as { payerUpiId?: unknown }).payerUpiId)

  if (amount == null) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "amount must be within allowed UPI bounds", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  if (orderId == null) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "orderId is required and must be a positive number", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  if (!payerUpiId) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "Valid payer UPI ID is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  try {
    const idempotencyKey = resolveIdempotencyKey(request, body, "upi:initiate")
    const initiated = await UpiCheckoutService.initiatePayment(idempotencyKey, amount, orderId, userId)

    logApiEvent("info", "payments.upi.initiate.success", {
      requestId: traceId,
      route: "/api/upi/initiate",
      method: "POST",
      userId,
      details: { transactionId: initiated.transactionId, orderId, amount, idempotencyKey },
    })

    return NextResponse.json(initiated)
  } catch (error) {
    recordUpiFailureMetric("/api/upi/initiate", traceId)
    return NextResponse.json({ error: "Failed to initialize UPI payment", errorCode: "RISK_BLOCKED" }, { status: 500 })
  }
}
