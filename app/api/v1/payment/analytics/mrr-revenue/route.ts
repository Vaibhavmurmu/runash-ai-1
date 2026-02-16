import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { getPaymentTransactionMonthlyTrends, getRevenueSummary } from "@/lib/repositories/payment-transactions"

function parseMonthParam(input: string | null, fallback: number) {
  const value = Number(input)
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(36, Math.round(value)))
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const months = parseMonthParam(request.nextUrl.searchParams.get("months"), 6)

  const [trend, summary] = await Promise.all([getPaymentTransactionMonthlyTrends(months), getRevenueSummary({})])
  const monthlyRecurringRevenue = trend.at(-1)?.revenue ?? 0

  return respondSuccess(request, {
    monthlyRecurringRevenue,
    trend,
    totals: summary,
  })
}
