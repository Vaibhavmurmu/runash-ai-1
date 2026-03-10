import { NextResponse } from "next/server"
import { UpiCheckoutService } from "@/lib/services/upi-checkout-service"

export async function GET(_: Request, context: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await context.params
  const status = await UpiCheckoutService.getStatus(transactionId)

  return NextResponse.json(status.payload, { status: status.found ? 200 : 404 })
}
