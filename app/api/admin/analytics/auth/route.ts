import { type NextRequest, NextResponse } from "next/server"
import { AuthAnalytics } from "@/lib/auth-analytics"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { getServerAuthSession } from "@/lib/auth/session"

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

function withRequestHeaders(requestId: string) {
  return {
    headers: {
      "x-request-id": requestId,
      "x-correlation-id": requestId,
    },
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id") ?? crypto.randomUUID()

  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, ...withRequestHeaders(requestId) })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { start, end } = analyticsSchema.parse(params)

    const analyticsData = await AuthAnalytics.getOverviewMetrics({ start, end })

    return NextResponse.json({ requestId, ...analyticsData }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "admin.auth.analytics.fetch_failed", error, { errorCode: "AUTH_ANALYTICS_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Failed to fetch analytics", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
