import { type NextRequest, NextResponse } from "next/server"
import { respondError } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"

const ROUTE = "/api/streams/sessions/[id]/end"

type EndSessionDependencies = {
  getSession: typeof getServerAuthSession
  getStream: typeof Database.getStream
  updateStream: typeof Database.updateStream
}

const defaultDependencies: EndSessionDependencies = {
  getSession: getServerAuthSession,
  getStream: Database.getStream,
  updateStream: Database.updateStream,
}

export async function handleEndSession(
  req: NextRequest,
  params: { id: string },
  dependencies: EndSessionDependencies = defaultDependencies,
) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()
  const session = await dependencies.getSession(req.headers)
  if (!session) {
    return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId, legacy: { error: "Unauthorized" } })
  }

  const stream = await dependencies.getStream(params.id)
  if (!stream) {
    return respondError(
      req,
      { code: "STREAM_SESSION_NOT_FOUND", message: "Stream session not found" },
      { status: 404, requestId, legacy: { error: "Stream session not found" } },
    )
  }

  if (String(stream.user_id) !== String(session.user.id)) {
    return respondError(req, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, requestId, legacy: { error: "Forbidden" } })
  }

  const updatedStream = await dependencies.updateStream(params.id, { status: "ended" } as never)

  logApiEvent("info", "streams.sessions.end", {
    requestId,
    route: ROUTE,
    method: req.method,
    userId: session.user.id,
    details: {
      operation: "stream-session-end",
      streamSessionId: params.id,
    },
  })

  return NextResponse.json({ session: updatedStream })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleEndSession(req, params)
}
