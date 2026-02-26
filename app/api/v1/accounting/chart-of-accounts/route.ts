import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getChartOfAccountsData } from "@/lib/services/accounting-ledger-service"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined
    const accounts = await getChartOfAccountsData(search)
    return respondSuccess(request, { accounts })
  } catch (error) {
    logApiRouteError(request, "accounting.chart_of_accounts.fetch_failed", error, { errorCode: "ACCOUNTING_CHART_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_CHART_FETCH_FAILED", message: "Failed to fetch chart of accounts" }, { status: 500 })
  }
}
