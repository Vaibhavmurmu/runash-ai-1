import { type NextRequest, NextResponse } from "next/server"
import { AuthLogger } from "@/lib/auth-logger"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { respondInternalServerError } from "@/lib/api/admin-route-utils"

const analyticsSchema = z.object({
  start: z
    .string()
    .optional()
    .default(() => {
      const date = new Date()
      date.setDate(date.getDate() - 7)
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
    requiredPermissions: ["system:logs", "admin:analytics"],
    auditEvent: "admin.logs.analytics.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { start, end } = analyticsSchema.parse(params)

    const analytics = await AuthLogger.getLogAnalytics({ start, end })

    return NextResponse.json(analytics)
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.logs.analytics.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_LOGS_ANALYTICS_READ_FAILED",
    })
  }
}
