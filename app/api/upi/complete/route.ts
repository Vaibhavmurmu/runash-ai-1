import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const COMPLETE_RATE_LIMIT = 20
const COMPLETE_WINDOW_MS = 60_000

function resolveIdempotencyKey(request: NextRequest, body: unknown): string {
  const fromHeader = request.headers.get("idempotency-key")?.trim()
  if (fromHeader) return fromHeader

  if (body && typeof body === "object" && "idempotencyKey" in body) {
    const candidate = (body as { idempotencyKey?: unknown }).idempotencyKey
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return `upi-complete:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(request: NextRequest) {
  const limiter = await rateLimit(request, "upi:complete", COMPLETE_RATE_LIMIT, COMPLETE_WINDOW_MS)
  if (!limiter.success) {
    return NextResponse.json(
      {
        error: "UPI completion is temporarily blocked due to risk controls.",
        errorCode: "RISK_BLOCKED",
      },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : ""

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const result = UpiCheckoutService.completeViaProvider({
    transactionId,
    idempotencyKey: resolveIdempotencyKey(request, body),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error, errorCode: result.errorCode }, { status: 400 })
  }

  return NextResponse.json(result)
}
