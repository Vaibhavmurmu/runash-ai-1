import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { DashboardService } from "@/lib/dashboard-service"
import { requireDashboardSessionUserId } from "../_auth"

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const userId = await requireDashboardSessionUserId(request)
    if (userId instanceof Response) return userId

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const activity = await DashboardService.getRecentActivity(Number.parseInt(userId), limit)
    return respondSuccess(request, activity, { requestId })
  } catch (error) {
    logApiEvent("error", "dashboard.activity.failed", {
      requestId,
      route: "/api/dashboard/activity",
      method: request.method,
      details: { operation: "get-dashboard-activity", code: "DASHBOARD_ACTIVITY_FAILED" },
      error,
    })
    return respondError(request, { code: "DASHBOARD_ACTIVITY_FAILED", message: "Unable to load dashboard activity." }, { status: 500, requestId })
  }
}
