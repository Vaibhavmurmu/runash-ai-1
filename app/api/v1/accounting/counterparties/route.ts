import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { getCounterpartiesData } from "@/lib/services/accounting-counterparties-service"

export async function GET(request: NextRequest) {
  try {
    const entityTypeParam = request.nextUrl.searchParams.get("entityType")
    const entityType = entityTypeParam === "client" || entityTypeParam === "vendor" ? entityTypeParam : undefined
    const counterparties = await getCounterpartiesData(entityType)
    return respondSuccess(request, { counterparties })
  } catch (error) {
    logApiRouteError(request, "accounting.counterparties.fetch_failed", error, { errorCode: "ACCOUNTING_COUNTERPARTIES_FETCH_FAILED" })
    return respondError(request, { code: "ACCOUNTING_COUNTERPARTIES_FETCH_FAILED", message: "Failed to fetch counterparties" }, { status: 500 })
  }
}
