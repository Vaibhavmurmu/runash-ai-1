import { NextRequest, NextResponse } from "next/server"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

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
  const body = await request.json().catch(() => ({}))
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : ""

  if (!transactionId) {
    return NextResponse.json(
      {
        error: "transactionId is required",
        errorCode: "RISK_BLOCKED",
      },
      { status: 400 },
    )
  }

  await UpiCheckoutService.completeViaProvider({
    transactionId,
    idempotencyKey: resolveIdempotencyKey(request, body),
    providerReference: typeof body?.providerReference === "string" ? body.providerReference : undefined,
    providerStatusReference: typeof body?.providerStatusReference === "string" ? body.providerStatusReference : undefined,
    status: body?.status === "success" || body?.status === "failed" ? body.status : undefined,
    failureReason: typeof body?.failureReason === "string" ? body.failureReason : undefined,
    failureCode:
      body?.failureCode === "INVALID_PIN" || body?.failureCode === "PIN_ATTEMPTS_EXCEEDED" || body?.failureCode === "RISK_BLOCKED"
        ? body.failureCode
        : undefined,
  })

  const status = await UpiCheckoutService.getStatus(transactionId)
  return NextResponse.json(status.payload, { status: status.found ? 200 : 404 })
}
