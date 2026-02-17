import { type NextRequest, NextResponse } from "next/server"
import { AuthAnalytics } from "@/lib/auth-analytics"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

const analyticsSchema = z.object({
  start: z
    .string()
    .optional()
    .default(() => {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split("T")[0]
    }),
  end: z
    .string()
    .optional()
    .default(() => {
      return new Date().toISOString().split("T")[0]
    }),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.auth.analytics.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { start, end } = analyticsSchema.parse(params)

    const analyticsData = await AuthAnalytics.getOverviewMetrics({ start, end })

    return NextResponse.json({ requestId: auth.requestId, ...analyticsData })
  } catch (error) {
    logApiRouteError(request, "admin.auth.analytics.fetch_failed", error, {
      errorCode: "AUTH_ANALYTICS_FETCH_FAILED",
      requestId: auth.requestId,
    })
    return NextResponse.json({ error: "Failed to fetch analytics", requestId: auth.requestId }, { status: 500 })
  }
}
