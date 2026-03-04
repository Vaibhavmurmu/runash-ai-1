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

    const achievements = await DashboardService.getAchievements(Number.parseInt(userId))
    return respondSuccess(request, achievements, { requestId })
  } catch (error) {
    logApiEvent("error", "dashboard.achievements.failed", {
      requestId,
      route: "/api/dashboard/achievements",
      method: request.method,
      details: { operation: "get-dashboard-achievements", code: "DASHBOARD_ACHIEVEMENTS_FAILED" },
      error,
    })
    return respondError(request, { code: "DASHBOARD_ACHIEVEMENTS_FAILED", message: "Unable to load dashboard achievements." }, { status: 500, requestId })
  }
}
