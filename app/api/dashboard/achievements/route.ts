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
