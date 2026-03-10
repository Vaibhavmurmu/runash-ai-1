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

  const body = await request.json().catch(() => ({}))
  const amount = typeof body?.amount === "number" && Number.isFinite(body.amount) && body.amount > 0 ? body.amount : null
  const rawOrderId = (body as { orderId?: unknown; order_id?: unknown })?.orderId ?? (body as { order_id?: unknown })?.order_id
  const orderId = typeof rawOrderId === "number" && Number.isFinite(rawOrderId) && rawOrderId > 0 ? rawOrderId : null

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

  if (orderId == null) {
    return NextResponse.json(
      {
        error: "orderId is required and must be a positive number",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }

  const idempotencyKey = resolveIdempotencyKey(request, body)
  const initiated = await UpiCheckoutService.initiatePayment(idempotencyKey, amount)

  try {
    const initiated = await UpiCheckoutService.initiatePayment(idempotencyKey, amount, orderId)
    return NextResponse.json(initiated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize UPI payment"
    return NextResponse.json({ error: message, errorCode: "RISK_BLOCKED" }, { status: 404 })
  }
}
