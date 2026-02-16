import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import {
  getOperationsFinanceSummary,
  getPayoutsSummary,
  getPayoutVisibility,
  getRevenueSummary,
  getRevenueTaxSummary,
  getRevenueTransactions,
} from "@/lib/repositories/payment-transactions"
import { getTaxBreakdown, getTaxLiabilitySummary } from "@/lib/repositories/tax"

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const from = parseDateParam(request.nextUrl.searchParams.get("from"))
    const to = parseDateParam(request.nextUrl.searchParams.get("to"))
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 200)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 200

    const [revenueSummary, revenueTaxSummary, operationsFinanceSummary, payoutsSummary, taxLiability, revenueTransactions, payoutVisibility, taxBreakdown] = await Promise.all([
      getRevenueSummary({ from, to }),
      getRevenueTaxSummary({ from, to }),
      getOperationsFinanceSummary({ from, to }),
      getPayoutsSummary({ from, to }),
      getTaxLiabilitySummary({ from, to }),
      getRevenueTransactions({ from, to, limit }),
      getPayoutVisibility({ from, to, limit }),
      getTaxBreakdown({ from, to, limit }),
    ])

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.reporting.viewed",
      resource: "payment.reporting",
      request,
      details: { hasFrom: Boolean(from), hasTo: Boolean(to), limit },
    })

    return respondSuccess(request, {
      revenue_summary: revenueSummary,
      revenue_tax_summary: revenueTaxSummary,
      operations_finance_summary: operationsFinanceSummary,
      payouts_summary: payoutsSummary,
      tax_liability_by_jurisdiction: taxLiability,
      revenue_transactions: revenueTransactions,
      payout_visibility: payoutVisibility,
      tax_breakdown: taxBreakdown,
    })
  } catch (error) {
    logApiRouteError(request, "payment.reporting.fetch_failed", error, { errorCode: "PAYMENT_REPORTING_FETCH_FAILED" })
    return respondError(request, { code: "PAYMENT_REPORTING_FETCH_FAILED", message: "Failed to fetch payment reporting data" }, { status: 500 })
  }
}
