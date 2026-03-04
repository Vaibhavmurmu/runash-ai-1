import { type NextRequest, NextResponse } from "next/server"
import { AuthAnalytics } from "@/lib/auth-analytics"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

const eventsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.auth.events.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const { page, limit } = eventsSchema.parse(params)
    const events = await AuthAnalytics.getRecentAuthEvents(page * limit)
    const start = (page - 1) * limit
    const pagedEvents = events.slice(start, start + limit)

    return NextResponse.json({ requestId: auth.requestId, events: pagedEvents, pagination: { page, limit, total: events.length } })
  } catch (error) {
    logApiRouteError(request, "admin.auth.events.fetch_failed", error, {
      errorCode: "AUTH_EVENTS_FETCH_FAILED",
      requestId: auth.requestId,
    })
    return NextResponse.json({ error: "Failed to fetch events", requestId: auth.requestId }, { status: 500 })
  }
}
