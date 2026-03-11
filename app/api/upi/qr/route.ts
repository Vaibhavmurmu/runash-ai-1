import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

import { logApiEvent } from "@/lib/api/logging"
import { recordUpiFailureMetric } from "@/lib/payments/upi-observability"
import { rateLimitByKey } from "@/lib/rate-limit"
import { isValidTransactionId, resolveTraceId, resolveUserId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

const DEFAULT_PAYEE_VPA = process.env.RUNASH_UPI_PAYEE_VPA || "runash@upi"
const DEFAULT_PAYEE_NAME = process.env.RUNASH_UPI_PAYEE_NAME || "RunAsh"

function buildUpiUri(params: { amount: number; transactionRef: string; transactionId: string }) {
  const upi = new URL("upi://pay")
  upi.searchParams.set("pa", DEFAULT_PAYEE_VPA)
  upi.searchParams.set("pn", DEFAULT_PAYEE_NAME)
  upi.searchParams.set("tn", `RunAsh checkout ${params.transactionId}`)
  upi.searchParams.set("tr", params.transactionRef)
  upi.searchParams.set("am", params.amount.toFixed(2))
  upi.searchParams.set("cu", "INR")
  return upi.toString()
}

export async function GET(request: NextRequest) {
  const traceId = resolveTraceId(request)
  const userId = resolveUserId(request, null)
  const transactionId = request.nextUrl.searchParams.get("transactionId")?.trim()
  const txLimiter = await rateLimitByKey(`upi:qr:tx:${transactionId || "unknown"}`, 15, 60_000)
  const userLimiter = await rateLimitByKey(`upi:qr:user:${userId}`, 20, 60_000)

  if (!txLimiter.success || !userLimiter.success) {
    recordUpiFailureMetric("/api/upi/qr", traceId)
    return NextResponse.json({ error: "QR fetch rate limit exceeded", errorCode: "RISK_BLOCKED" }, { status: 429 })
  }

  if (!transactionId || !isValidTransactionId(transactionId)) {
    recordUpiFailureMetric("/api/upi/qr", traceId)
    return NextResponse.json({ error: "transactionId is required", errorCode: "RISK_BLOCKED" }, { status: 400 })
  }

  const status = await UpiCheckoutService.getStatus(transactionId)
  if (!status.found) {
    recordUpiFailureMetric("/api/upi/qr", traceId)
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  if (status.payload.ownerUserId && status.payload.ownerUserId !== userId) {
    recordUpiFailureMetric("/api/upi/qr", traceId)
    return NextResponse.json({ error: "Transaction ownership mismatch", errorCode: "RISK_BLOCKED" }, { status: 403 })
  }

  logApiEvent("info", "payments.upi.qr.request", {
    requestId: traceId,
    route: "/api/upi/qr",
    method: "GET",
    userId,
    details: { transactionId },
  })

  const upiUri = buildUpiUri({ amount: status.payload.amount, transactionRef: status.payload.transactionReference, transactionId: status.payload.transactionId })
  const qrDataUrl = await QRCode.toDataURL(upiUri, { errorCorrectionLevel: "M", width: 480, margin: 1 })

  return NextResponse.json({
    transactionId: status.payload.transactionId,
    amount: status.payload.amount,
    currency: status.payload.currency,
    upiUri,
    qrDataUrl,
  })
}
