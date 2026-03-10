import { NextRequest, NextResponse } from "next/server"
import { logApiEvent } from "@/lib/api/logging"
import { recordUpiFailureMetric, recordUpiTimeoutMetric } from "@/lib/payments/upi-observability"
import { isValidTransactionId, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { rateLimitByKey } from "@/lib/rate-limit"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

export async function GET(request: NextRequest, context: { params: Promise<{ transactionId: string }> }) {
  const traceId = resolveTraceId(request)
  const userId = resolveUserId(request, null)
  const { transactionId } = await context.params
  const status = await UpiCheckoutService.getStatus(transactionId)

  return NextResponse.json(status.payload, { status: status.found ? 200 : 404 })
}
