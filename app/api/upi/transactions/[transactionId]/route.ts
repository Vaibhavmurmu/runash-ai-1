import { NextRequest, NextResponse } from "next/server"
import { recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { isValidTransactionId, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

export async function GET(request: NextRequest, context: { params: Promise<{ transactionId: string }> }) {
  const traceId = resolveTraceId(request)
  const userId = resolveUserId(request, null)
  const { transactionId } = await context.params

  if (!transactionId || !isValidTransactionId(transactionId)) {
    recordUpiFailureMetric("/api/upi/transactions/:transactionId", traceId)
    return NextResponse.json({ error: "transactionId is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const details = await UpiCheckoutService.getTransactionDetails(transactionId)
  if (!details.found) {
    recordUpiFailureMetric("/api/upi/transactions/:transactionId", traceId)
    return NextResponse.json(details.payload, { status: 404 })
  }

  if (details.payload.ownerUserId && details.payload.ownerUserId !== userId) {
    recordUpiFailureMetric("/api/upi/transactions/:transactionId", traceId)
    return NextResponse.json({ error: "Transaction ownership mismatch", errorCode: "RISK_BLOCKED" }, { status: 403 })
  }

  return NextResponse.json(details.payload)
}
