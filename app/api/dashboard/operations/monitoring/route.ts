import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { RBACManager } from "@/lib/rbac"
import { getAuthSecurityHealthMetrics, getScopedAuthMonitoringData, type MonitoringVisibility } from "@/lib/auth-observability"
import { resolveRequestId } from "@/lib/api/response"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    const session = await getServerAuthSession(request.headers)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 })
    }

    const userId = Number.parseInt(session.user.id)
    const [canViewDashboard, canViewAdminAnalytics, canViewSystemLogs] = await Promise.all([
      RBACManager.hasPermission(userId, "dashboard:read"),
      RBACManager.hasPermission(userId, "admin:analytics"),
      RBACManager.hasPermission(userId, "system:logs"),
    ])

    if (!canViewDashboard && !canViewAdminAnalytics && !canViewSystemLogs) {
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 })
    }

    const visibility: MonitoringVisibility = canViewSystemLogs ? "admin" : canViewAdminAnalytics ? "operator" : "viewer"

    return NextResponse.json({
      requestId,
      monitoring: getScopedAuthMonitoringData(visibility),
      metrics: getAuthSecurityHealthMetrics(60),
    })
  } catch (error) {
    logApiRouteError(request, "dashboard.operations.monitoring.fetch_failed", error, {
      requestId,
      errorCode: "DASHBOARD_MONITORING_FETCH_FAILED",
    })
    return NextResponse.json({ error: "Failed to load monitoring dashboard", requestId }, { status: 500 })
  }
}
