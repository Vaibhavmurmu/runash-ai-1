import { NextRequest, NextResponse } from "next/server"
import { recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { isValidTransactionId, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

export async function GET(request: NextRequest, context: { params: Promise<{ transactionId: string }> }) {
  const traceId = resolveTraceId(request)
  const userId = resolveUserId(request, null)
  const { transactionId } = await context.params
  const details = await UpiCheckoutService.getTransactionDetails(transactionId)

  return NextResponse.json(details.payload, { status: details.found ? 200 : 404 })
}
