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

  const userLimiter = await rateLimitByKey(`upi:status:user:${userId}`, 40, 60_000)
  const txLimiter = await rateLimitByKey(`upi:status:tx:${transactionId || "unknown"}`, 30, 60_000)
  if (!userLimiter.success || !txLimiter.success) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "Status polling rate limit exceeded", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  if (!transactionId || !isValidTransactionId(transactionId)) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "transactionId is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const status = await UpiCheckoutService.getStatus(transactionId)
  if (!status.found) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json(status.payload, { status: 404 })
  }

  if (status.payload.ownerUserId && status.payload.ownerUserId !== userId) {
    recordUpiFailureMetric("/api/upi/status/:transactionId", traceId)
    return NextResponse.json({ error: "Transaction ownership mismatch", errorCode: "RISK_BLOCKED" }, { status: 403 })
  }

  if (status.payload.status === "failed" && status.payload.failedReason === "UPI provider timeout.") {
    recordUpiTimeoutMetric("/api/upi/status/:transactionId", traceId)
  }

  logApiEvent("info", "payments.upi.status.fetch", {
    requestId: traceId,
    route: "/api/upi/status/:transactionId",
    method: "GET",
    userId,
    details: { transactionId, status: status.payload.status },
  })

  return NextResponse.json(status.payload)
}
