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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id") ?? crypto.randomUUID()

  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response

    const { id } = await context.params
    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true LIMIT 1`, [id])

    if (!plans[0]) {
      return NextResponse.json({ error: "Plan not found", requestId }, { status: 404, ...withRequestHeaders(requestId) })
    }

    return NextResponse.json({ requestId, plan: plans[0] }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "billing.plan.get_failed", error, { errorCode: "BILLING_PLAN_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
