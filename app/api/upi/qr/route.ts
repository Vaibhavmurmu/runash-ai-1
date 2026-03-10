import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

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
  const transactionId = request.nextUrl.searchParams.get("transactionId")?.trim()

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 })
  }

  const status = UpiCheckoutService.getStatus(transactionId)
  if (!status.found) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  const upiUri = buildUpiUri({
    amount: status.payload.amount,
    transactionRef: status.payload.transactionReference,
    transactionId: status.payload.transactionId,
  })

  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: "M",
    width: 480,
    margin: 1,
  })

  return NextResponse.json({
    transactionId: status.payload.transactionId,
    amount: status.payload.amount,
    currency: status.payload.currency,
    upiUri,
    qrDataUrl,
  })
}
