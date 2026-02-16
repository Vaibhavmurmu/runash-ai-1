import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import {
  getPaymentAnalyticsSummary,
  getPortalMetricsSnapshot,
} from "@/services/payment-checkout-profile-service"
import { getOperationsFinanceSummary, getPayoutsSummary, getRevenueTaxSummary } from "@/lib/repositories/payment-transactions"

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const from = parseDateParam(request.nextUrl.searchParams.get("from"))
  const to = parseDateParam(request.nextUrl.searchParams.get("to"))

  const [checkoutAndRecovery, portalMetrics, revenueTaxSummary, payoutSummary, operationsSummary] = await Promise.all([
    getPaymentAnalyticsSummary(access.sessionUser.userId),
    getPortalMetricsSnapshot(access.sessionUser.userId),
    getRevenueTaxSummary({ from, to }),
    getPayoutsSummary({ from, to }),
    getOperationsFinanceSummary({ from, to }),
  ])

  return respondSuccess(request, {
    checkoutConversion: checkoutAndRecovery.checkoutConversion,
    failedPaymentRecovery: checkoutAndRecovery.failedPaymentRecovery,
    fallbackUsage: checkoutAndRecovery.fallbackUsage,
    revenueTaxSummary,
    payoutSummary,
    operationsSummary,
    portalMetrics,
  })
}
