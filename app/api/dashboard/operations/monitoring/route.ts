import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "@/lib/rbac"
import { getAuthSecurityHealthMetrics, getScopedAuthMonitoringData, type MonitoringVisibility } from "@/lib/auth-observability"
import { resolveRequestId } from "@/lib/api/response"
import { logApiRouteError } from "@/lib/api/logging"
import { respondError, respondSuccess } from "@/lib/api/envelope"

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    const session = await getServerAuthSession(request.headers)
    if (!session?.user?.id) {
      return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId, legacy: { error: "Unauthorized" } })
    }

    const userId = Number.parseInt(session.user.id)
    const [canViewDashboard, canViewAdminAnalytics, canViewSystemLogs] = await Promise.all([
      RBACManager.hasPermission(userId, "dashboard:read"),
      RBACManager.hasPermission(userId, "admin:analytics"),
      RBACManager.hasPermission(userId, "system:logs"),
    ])

    if (!canViewDashboard && !canViewAdminAnalytics && !canViewSystemLogs) {
      return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, requestId, legacy: { error: "Forbidden" } })
    }

    const visibility: MonitoringVisibility = canViewSystemLogs ? "admin" : canViewAdminAnalytics ? "operator" : "viewer"
    const payload = {
      monitoring: getScopedAuthMonitoringData(visibility),
      metrics: getAuthSecurityHealthMetrics(60),
    }

    return respondSuccess(request, payload, { requestId, legacy: payload })
  } catch (error) {
    logApiRouteError(request, "dashboard.operations.monitoring.fetch_failed", error, {
      requestId,
      errorCode: "DASHBOARD_MONITORING_FETCH_FAILED",
    })
    return respondError(request, { code: "DASHBOARD_MONITORING_FETCH_FAILED", message: "Failed to load monitoring dashboard" }, { status: 500, requestId, legacy: { error: "Failed to load monitoring dashboard" } })
  }
}
