import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { getPayoutsSummary, getRevenueSummary } from "@/lib/repositories/payment-transactions"
import { getTaxLiabilitySummary } from "@/lib/repositories/tax"

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const from = parseDateParam(request.nextUrl.searchParams.get("from"))
    const to = parseDateParam(request.nextUrl.searchParams.get("to"))

    const [revenueSummary, payoutsSummary, taxLiability] = await Promise.all([
      getRevenueSummary({ from, to }),
      getPayoutsSummary({ from, to }),
      getTaxLiabilitySummary({ from, to }),
    ])

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.reporting.viewed",
      resource: "payment.reporting",
      request,
      details: { hasFrom: Boolean(from), hasTo: Boolean(to) },
    })

    return respondSuccess(request, {
      revenue_summary: revenueSummary,
      payouts_summary: payoutsSummary,
      tax_liability_by_jurisdiction: taxLiability,
    })
  } catch (error) {
    logApiRouteError(request, "payment.reporting.fetch_failed", error, { errorCode: "PAYMENT_REPORTING_FETCH_FAILED" })
    return respondError(request, { code: "PAYMENT_REPORTING_FETCH_FAILED", message: "Failed to fetch payment reporting data" }, { status: 500 })
  }
}
