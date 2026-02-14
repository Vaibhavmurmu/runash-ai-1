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
