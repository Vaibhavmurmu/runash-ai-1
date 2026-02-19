import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getAuthSecurityHealthMetrics } from "@/lib/auth-observability"
import { logApiRouteError } from "@/lib/api/logging"

const metricsSchema = z.object({
  windowMinutes: z.coerce.number().int().min(5).max(24 * 60).default(60),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.auth.metrics.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { windowMinutes } = metricsSchema.parse(params)

    return NextResponse.json({
      requestId: auth.requestId,
      metrics: getAuthSecurityHealthMetrics(windowMinutes),
    })
  } catch (error) {
    logApiRouteError(request, "admin.auth.metrics.fetch_failed", error, {
      errorCode: "ADMIN_AUTH_METRICS_FETCH_FAILED",
      requestId: auth.requestId,
      userId: String(auth.userId),
    })
    return NextResponse.json({ error: "Failed to fetch auth metrics", requestId: auth.requestId }, { status: 500 })
  }
}
