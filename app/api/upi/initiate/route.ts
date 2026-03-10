import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const INITIATE_RATE_LIMIT = 20
const INITIATE_WINDOW_MS = 60_000

function resolveIdempotencyKey(request: NextRequest, body: unknown): string {
  const fromHeader = request.headers.get("idempotency-key")?.trim()
  if (fromHeader) return fromHeader

  if (body && typeof body === "object" && "idempotencyKey" in body) {
    const candidate = (body as { idempotencyKey?: unknown }).idempotencyKey
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return `upi-init:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(request: NextRequest) {
  const limiter = await rateLimit(request, "upi:initiate", INITIATE_RATE_LIMIT, INITIATE_WINDOW_MS)

  if (!limiter.success) {
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
  if (amount == null) {
    return NextResponse.json(
      {
        error: "amount is required and must be a positive number",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }
  const idempotencyKey = resolveIdempotencyKey(request, body)
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : ""
  const initiated = UpiCheckoutService.initiatePayment(idempotencyKey, amount, orderId || undefined)

  return NextResponse.json(initiated)
}
