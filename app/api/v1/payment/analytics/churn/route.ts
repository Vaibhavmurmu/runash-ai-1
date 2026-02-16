import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { getPortalMetricsSnapshot } from "@/services/payment-checkout-profile-service"

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const metrics = await getPortalMetricsSnapshot(access.sessionUser.userId)
  const renewalPopulation = metrics.renewalAtRisk + metrics.renewalHealthy
  const churnRiskRatePercent = renewalPopulation > 0 ? (metrics.renewalAtRisk / renewalPopulation) * 100 : 0

  return respondSuccess(request, {
    renewalAtRisk: metrics.renewalAtRisk,
    renewalHealthy: metrics.renewalHealthy,
    churnRiskRatePercent,
  })
}
