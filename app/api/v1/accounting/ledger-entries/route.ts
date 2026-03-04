import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getLedgerEntriesData } from "@/lib/services/accounting-ledger-service"

export async function GET(request: NextRequest) {
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 200)
    const limit = Number.isFinite(limitParam) ? limitParam : 200
    const entries = await getLedgerEntriesData(limit)
    return respondSuccess(request, { entries })
  } catch (error) {
    logApiRouteError(request, "accounting.ledger_entries.fetch_failed", error, { errorCode: "ACCOUNTING_LEDGER_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_LEDGER_FETCH_FAILED", message: "Failed to fetch ledger entries" }, { status: 500 })
  }
}
