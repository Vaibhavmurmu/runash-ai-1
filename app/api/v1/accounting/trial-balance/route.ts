import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getTrialBalanceData } from "@/lib/services/accounting-ledger-service"

export async function GET(request: NextRequest) {
  try {
    const trialBalance = await getTrialBalanceData()
    return respondSuccess(request, trialBalance)
  } catch (error) {
    logApiRouteError(request, "accounting.trial_balance.fetch_failed", error, { errorCode: "ACCOUNTING_TRIAL_BALANCE_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_TRIAL_BALANCE_FETCH_FAILED", message: "Failed to fetch trial balance" }, { status: 500 })
  }
}
