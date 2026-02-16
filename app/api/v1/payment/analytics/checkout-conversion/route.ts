import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { getPaymentAnalyticsSummary } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const summary = await getPaymentAnalyticsSummary(access.sessionUser.userId)
  return respondSuccess(request, summary.checkoutConversion)
}
