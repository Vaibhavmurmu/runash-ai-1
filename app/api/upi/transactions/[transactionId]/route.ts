import { NextResponse } from "next/server"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

export async function GET(_: Request, context: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await context.params
  const details = await UpiCheckoutService.getTransactionDetails(transactionId)

  return NextResponse.json(details.payload, { status: details.found ? 200 : 404 })
}
