import { NextRequest, NextResponse } from "next/server"

import { logApiEvent } from "@/lib/api/logging"
import { recordUpiCallbackVerificationFailureMetric, recordUpiFailureMetric, recordUpiTimeoutMetric } from "@/lib/payments/upi-observability"
import { resolveTraceId } from "@/lib/payments/upi-route-security"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"
import { parseUpiProviderCallbackPayload, verifyUpiProviderSignature } from "@/lib/services/upi-provider-callback"

const SIGNATURE_HEADER = "x-upi-signature"

export async function POST(request: NextRequest) {
  const traceId = resolveTraceId(request)
  const rawBody = await request.text()

  const isSignatureValid = verifyUpiProviderSignature({
    payload: rawBody,
    signature: request.headers.get(SIGNATURE_HEADER),
    secret: process.env.UPI_PROVIDER_WEBHOOK_SECRET,
  })

  if (!isSignatureValid) {
    recordUpiFailureMetric("/api/upi/webhook/provider", traceId)
    recordUpiCallbackVerificationFailureMetric("/api/upi/webhook/provider", traceId)
    return NextResponse.json({ error: "Invalid or missing callback signature." }, { status: 401 })
  }

  const parsedBody = (() => {
    try {
      return JSON.parse(rawBody || "{}")
    } catch {
      return null
    }
  })()

  const payload = parseUpiProviderCallbackPayload(parsedBody)
  if (!payload) {
    recordUpiFailureMetric("/api/upi/webhook/provider", traceId)
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 })
  }

  if (payload.status === "TIMEOUT") {
    recordUpiTimeoutMetric("/api/upi/webhook/provider", traceId)
  }

  const result = await UpiCheckoutService.applyProviderCallback({
    transactionId: payload.transactionId,
    providerStatus: payload.status,
    providerReference: payload.providerReference,
    providerEventId: payload.eventId,
  })

  if (!result.ok) {
    recordUpiFailureMetric("/api/upi/webhook/provider", traceId)
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  logApiEvent("info", "payments.upi.webhook.provider.processed", {
    requestId: traceId,
    route: "/api/upi/webhook/provider",
    method: "POST",
    details: {
      transactionId: result.transactionId,
      status: result.status,
      idempotent: result.idempotent,
      verifiedBy: result.verifiedBy,
    },
  })

  return NextResponse.json({
    ok: true,
    idempotent: result.idempotent,
    transactionId: result.transactionId,
    orderId: result.orderId,
    status: result.status,
    verifiedAt: result.verifiedAt,
    verifiedBy: result.verifiedBy,
  })
}
