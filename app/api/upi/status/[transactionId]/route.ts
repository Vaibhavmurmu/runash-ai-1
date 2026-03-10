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
  if (!isValidTransactionId(transactionId)) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "Invalid transactionId", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const userLimiter = await rateLimitByKey(`upi:status:user:${userId}`, 30, 60_000)
  const txLimiter = await rateLimitByKey(`upi:status:tx:${transactionId}`, 20, 60_000)
  if (!userLimiter.success || !txLimiter.success) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "Status polling rate limit exceeded", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  logApiEvent("info", "payments.upi.status.request", {
    requestId: traceId,
    route: "/api/upi/status/:transactionId",
    method: "GET",
    userId,
    details: { transactionId },
  })

  const status = UpiCheckoutService.getStatus(transactionId)
  if (status.found && status.payload.userId !== userId) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "Transaction ownership mismatch", errorCode: "RISK_BLOCKED" }, { status: 403 })
  }

  if (status.payload.failedReason === "UPI provider timeout.") {
    recordUpiTimeoutMetric("/api/upi/status/:transactionId", traceId)
  }

  return NextResponse.json(status.payload, { status: status.found ? 200 : 404 })
}
