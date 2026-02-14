import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { requireBillingSession } from "@/lib/billing-auth"

export async function GET(request: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse) {
    return auth.unauthorizedResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get("currency") || "INR"

    const paymentMethods = await PaymentService.getPaymentMethods(currency)

    return NextResponse.json({
      success: true,
      data: paymentMethods,
    })
  } catch (error) {
    console.error("Failed to fetch payment methods:", error)
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 })
  }
}
