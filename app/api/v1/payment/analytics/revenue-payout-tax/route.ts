import { type NextRequest } from "next/server"
import { respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { getOperationsFinanceSummary, getPayoutsSummary, getRevenueTaxSummary } from "@/lib/repositories/payment-transactions"

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const from = parseDateParam(request.nextUrl.searchParams.get("from"))
  const to = parseDateParam(request.nextUrl.searchParams.get("to"))

  const [revenueTaxSummary, payoutSummary, operationsSummary] = await Promise.all([
    getRevenueTaxSummary({ from, to }),
    getPayoutsSummary({ from, to }),
    getOperationsFinanceSummary({ from, to }),
  ])

  return respondSuccess(request, {
    revenueTaxSummary,
    payoutSummary,
    operationsSummary,
  })
}
