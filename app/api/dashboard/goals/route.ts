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

    const goals = await DashboardService.getMonthlyGoals(Number.parseInt(userId))
    return respondSuccess(request, goals, { requestId })
  } catch (error) {
    logApiEvent("error", "dashboard.goals.failed", {
      requestId,
      route: "/api/dashboard/goals",
      method: request.method,
      details: { operation: "get-dashboard-goals", code: "DASHBOARD_GOALS_FAILED" },
      error,
    })
    return respondError(request, { code: "DASHBOARD_GOALS_FAILED", message: "Unable to load dashboard goals." }, { status: 500, requestId })
  }
}
