import { NextRequest, NextResponse } from "next/server"

import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"
import {
  parseUpiProviderCallbackPayload,
  verifyUpiProviderSignature,
} from "@/lib/services/upi-provider-callback"

const SIGNATURE_HEADER = "x-upi-signature"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const isSignatureValid = verifyUpiProviderSignature({
    payload: rawBody,
    signature: request.headers.get(SIGNATURE_HEADER),
    secret: process.env.UPI_PROVIDER_WEBHOOK_SECRET,
  })

  if (!isSignatureValid) {
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
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 })
  }

  const result = UpiCheckoutService.applyProviderCallback({
    transactionId: payload.transactionId,
    providerStatus: payload.status,
    providerReference: payload.providerReference,
    providerEventId: payload.eventId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

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
