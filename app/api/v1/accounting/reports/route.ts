import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getReportsData } from "@/lib/services/accounting-reports-service"

export async function GET(request: NextRequest) {
  try {
    const reports = await getReportsData()
    return respondSuccess(request, reports)
  } catch (error) {
    logApiRouteError(request, "accounting.reports.fetch_failed", error, { errorCode: "ACCOUNTING_REPORTS_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_REPORTS_FETCH_FAILED", message: "Failed to fetch accounting reports" }, { status: 500 })
  }
}
