import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getReconciliationData } from "@/lib/services/accounting-reconciliation-service"

export async function GET(request: NextRequest) {
  try {
    const taxPeriod = request.nextUrl.searchParams.get("taxPeriod") ?? undefined
    const status = request.nextUrl.searchParams.get("status") ?? undefined
    const items = await getReconciliationData(taxPeriod, status)
    return respondSuccess(request, { items })
  } catch (error) {
    logApiRouteError(request, "accounting.reconciliation.fetch_failed", error, { errorCode: "ACCOUNTING_RECONCILIATION_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_RECONCILIATION_FETCH_FAILED", message: "Failed to fetch reconciliation data" }, { status: 500 })
  }
}
