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

    const stats = await DashboardService.getDashboardStats(Number.parseInt(userId))
    return respondSuccess(request, stats, { requestId })
  } catch (error) {
    logApiEvent("error", "dashboard.stats.failed", {
      requestId,
      route: "/api/dashboard/stats",
      method: request.method,
      details: { operation: "get-dashboard-stats", code: "DASHBOARD_STATS_FAILED" },
      error,
    })
    return respondError(
      request,
      { code: "DASHBOARD_STATS_FAILED", message: "Unable to load dashboard stats." },
      { status: 500, requestId },
    )
  }
}
