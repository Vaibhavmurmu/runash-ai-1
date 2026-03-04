import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response

    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC, created_at ASC`)

    return respondSuccess(
      request,
      { plans },
      {
        legacy: { plans },
      },
    )
  } catch (error) {
    logApiRouteError(request, "billing.plans.get_failed", error, { errorCode: "BILLING_PLANS_FETCH_FAILED" })
    return respondError(request, { code: "BILLING_PLANS_FETCH_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
