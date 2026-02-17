import { type NextRequest, NextResponse } from "next/server"
import { AuthAnalytics } from "@/lib/auth-analytics"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { getServerAuthSession } from "@/lib/auth/session"

const eventsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 50)),
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
    const { limit } = eventsSchema.parse(params)

    const events = await AuthAnalytics.getRecentAuthEvents(limit)

    return NextResponse.json({ requestId, events }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "admin.auth.events.fetch_failed", error, { errorCode: "AUTH_EVENTS_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Failed to fetch events", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
