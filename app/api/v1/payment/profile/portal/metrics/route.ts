import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { getCheckoutAnalyticsSnapshot, getPaymentAnalyticsSummary, getPortalMetricsSnapshot } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const [metrics, checkoutAnalytics, analyticsSummary] = await Promise.all([
    getPortalMetricsSnapshot(access.sessionUser.userId),
    getCheckoutAnalyticsSnapshot(access.sessionUser.userId),
    getPaymentAnalyticsSummary(access.sessionUser.userId),
  ])

  return respondSuccess(request, {
    ...metrics,
    checkoutAnalytics,
    analyticsSummary,
  })
}
