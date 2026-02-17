import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getAuthMetricsSnapshot, getAuthSecurityDashboardData } from "@/lib/auth-observability"
import { logApiRouteError } from "@/lib/api/logging"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.security.analytics.read",
  })

  if (!auth.success) return auth.response

  try {
    return NextResponse.json({
      requestId: auth.requestId,
      dashboard: getAuthSecurityDashboardData(24 * 60),
      realtimeMetrics: getAuthMetricsSnapshot(200),
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
