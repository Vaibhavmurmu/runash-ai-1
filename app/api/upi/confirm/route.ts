import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const CONFIRM_RATE_LIMIT = 15
const CONFIRM_WINDOW_MS = 60_000

function resolveIdempotencyKey(request: NextRequest, body: unknown): string {
  const fromHeader = request.headers.get("idempotency-key")?.trim()
  if (fromHeader) return fromHeader

  if (body && typeof body === "object" && "idempotencyKey" in body) {
    const candidate = (body as { idempotencyKey?: unknown }).idempotencyKey
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return `upi-confirm:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(request: NextRequest) {
  const limiter = await rateLimit(request, "upi:confirm", CONFIRM_RATE_LIMIT, CONFIRM_WINDOW_MS)

  if (!limiter.success) {
    return NextResponse.json(
      {
        error: "Confirmation is temporarily blocked due to risk controls.",
        errorCode: "RISK_BLOCKED",
      },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : ""
  const pin = typeof body?.pin === "string" ? body.pin : ""

  if (!transactionId) {
    return NextResponse.json(
      {
        error: "transactionId is required",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }

  const idempotencyKey = resolveIdempotencyKey(request, body)
  const confirmation = await UpiCheckoutService.confirmPayment({
    transactionId,
    pin,
    idempotencyKey,
  })

  if (!confirmation.ok) {
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

  return NextResponse.json(confirmation)
}
