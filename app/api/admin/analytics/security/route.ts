import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getAuthSecurityHealthMetrics, getScopedAuthMonitoringData, type MonitoringVisibility } from "@/lib/auth-observability"
import { RBACManager } from "@/lib/rbac"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.security.analytics.read",
  })

  if (!auth.success) return auth.response

  try {
    const [canViewSystemLogs, canViewAdminAnalytics] = await Promise.all([
      RBACManager.hasPermission(auth.userId, "system:logs"),
      RBACManager.hasPermission(auth.userId, "admin:analytics"),
    ])

    const visibility: MonitoringVisibility = canViewSystemLogs ? "admin" : canViewAdminAnalytics ? "operator" : "viewer"

    return NextResponse.json({
      requestId: auth.requestId,
      monitoring: getScopedAuthMonitoringData(visibility, 24 * 60),
      metrics: getAuthSecurityHealthMetrics(60),
    })
  } catch (error) {
    logApiRouteError(request, "admin.security.analytics.fetch_failed", error, {
      requestId: auth.requestId,
      errorCode: "ADMIN_SECURITY_ANALYTICS_FETCH_FAILED",
      userId: String(auth.userId),
    })

    return NextResponse.json({ error: "Failed to fetch security analytics", requestId: auth.requestId }, { status: 500 })
  }
}
