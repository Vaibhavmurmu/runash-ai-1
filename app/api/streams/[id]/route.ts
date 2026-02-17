import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

const ROUTE = "/api/streams/[id]"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const streamId = Number.parseInt(params.id)
    const stream = await Database.getStreamById(streamId)

    if (!stream) {
      return respondError(req, { code: "STREAM_NOT_FOUND", message: "Stream not found" }, { status: 404, requestId })
    }

    return respondSuccess(req, { stream }, { requestId })
  } catch (error) {
    logApiEvent("error", "streams.get.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "get-stream", code: "STREAM_GET_FAILED" },
      error,
    })
    return respondError(req, { code: "STREAM_GET_FAILED", message: "Unable to load stream." }, { status: 500, requestId })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const streamId = Number.parseInt(params.id)
    const stream = await Database.getStreamById(streamId)

    if (!stream || stream.user_id !== session.user.id) {
      return respondError(
        req,
        { code: "STREAM_NOT_FOUND", message: "Stream not found or unauthorized" },
        { status: 404, requestId },
      )
    }

    await Database.updateStream(streamId, { status: "deleted" })
    return respondSuccess(req, { success: true }, { requestId })
  } catch (error) {
    logApiEvent("error", "streams.delete.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "delete-stream", code: "STREAM_DELETE_FAILED" },
      error,
    })
    return respondError(req, { code: "STREAM_DELETE_FAILED", message: "Unable to delete stream." }, { status: 500, requestId })
  }
}
