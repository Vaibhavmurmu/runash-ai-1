import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"
import { handleStreamsGet, handleStreamsPost, type StreamsRouteDeps } from "./streams-route-handler"

const ROUTE = "/api/streams"

const defaultDeps: StreamsRouteDeps = {
  getSession: getServerAuthSession,
  database: Database,
  respondOk: respondSuccess,
  respondErr: respondError,
  logEvent: logApiEvent,
}

export { sellerScheduleRequestSchema } from "./streams-route-handler"

export async function POST(req: NextRequest) {
  return handleStreamsPost(req, defaultDeps)
}

export async function GET(req: NextRequest) {
  return handleStreamsGet(req, defaultDeps)
}

export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { id, ...updateData } = await req.json()

    if (!id) {
      return respondError(req, { code: "VALIDATION_FAILED", message: "Stream ID required" }, { status: 400, requestId })
    }

    const stream = await Database.updateStream(id, updateData)

    logApiEvent("info", "streams.update.success", {
      requestId,
      route: ROUTE,
      method: req.method,
      userId: session.user.id,
      details: { operation: "update-stream", streamId: id, changedFields: Object.keys(updateData) },
    })

    return respondSuccess(req, { stream }, { requestId })
  } catch (error) {
    logApiEvent("error", "streams.update.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "update-stream", code: "STREAM_UPDATE_FAILED" },
      error,
    })
    return respondError(req, { code: "STREAM_UPDATE_FAILED", message: "Unable to update stream." }, { status: 500, requestId })
  }
}
