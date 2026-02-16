import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { PaymentService } from "@/lib/payment-service"

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get("currency") || "INR"
    const paymentMethods = await PaymentService.getPaymentMethods(currency)
    return respondSuccess(request, paymentMethods)
  } catch (error) {
    logApiRouteError(request, "payment.methods.fetch_failed", error, { errorCode: "PAYMENT_METHODS_FETCH_FAILED" })
    return respondError(request, { code: "PAYMENT_METHODS_FETCH_FAILED", message: "Failed to fetch payment methods" }, { status: 500 })
  }
}
