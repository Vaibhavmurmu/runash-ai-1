import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { logApiRouteError } from "@/lib/api/logging"

function withRequestHeaders(requestId: string) {
  return {
    headers: {
      "x-request-id": requestId,
      "x-correlation-id": requestId,
    },
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id") ?? crypto.randomUUID()

  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response

    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC, created_at ASC`)
    return NextResponse.json({ requestId, plans }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "billing.plans.get_failed", error, { errorCode: "BILLING_PLANS_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
