import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { DashboardService } from "@/lib/dashboard-service"

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

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
