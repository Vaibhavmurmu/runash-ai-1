import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response

    const { id } = await context.params
    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true LIMIT 1`, [id])

    if (!plans[0]) {
      return respondError(request, { code: "PLAN_NOT_FOUND", message: "Plan not found" }, { status: 404 })
    }

    return respondSuccess(
      request,
      { plan: plans[0] },
      {
        legacy: { plan: plans[0] },
      },
    )
  } catch (error) {
    logApiRouteError(request, "billing.plan.get_failed", error, { errorCode: "BILLING_PLAN_FETCH_FAILED" })
    return respondError(request, { code: "BILLING_PLAN_FETCH_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
