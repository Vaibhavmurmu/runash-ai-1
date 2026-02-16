import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { getPayoutsSummary, getRevenueSummary } from "@/lib/repositories/payment-transactions"

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("billing:read")
  if ("response" in access) return access.response

  const [revenue, payouts] = await Promise.all([getRevenueSummary({}), getPayoutsSummary({})])

  const balance = Math.max(0, revenue.netRevenue - payouts.refundedAmount)

  return respondSuccess(request, {
    balance,
    totalRevenue: revenue.netRevenue,
    transactions: revenue.transactions,
    refundedAmount: payouts.refundedAmount,
  })
}
