import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { getCheckoutAnalyticsSnapshot, getPortalMetricsSnapshot } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const [metrics, checkoutAnalytics] = await Promise.all([
    getPortalMetricsSnapshot(access.sessionUser.userId),
    getCheckoutAnalyticsSnapshot(access.sessionUser.userId),
  ])

  return respondSuccess(request, {
    ...metrics,
    checkoutAnalytics,
  })
}
