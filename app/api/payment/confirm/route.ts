import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { intentId, idempotencyKey } = body

    if (!intentId) {
      return NextResponse.json({ error: "Missing required field: intentId" }, { status: 400 })
    }

    const requestIdempotencyKey = idempotencyKey || request.headers.get("x-idempotency-key") || undefined
    const transaction = await PaymentService.processPayment(intentId, requestIdempotencyKey)

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch {
    console.error("Payment confirmation failed")
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
}
