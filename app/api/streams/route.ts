import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

const ROUTE = "/api/streams"

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { title, description, platform } = await req.json()

    if (!title || !platform) {
      return respondError(
        req,
        { code: "VALIDATION_FAILED", message: "Title and platform are required" },
        { status: 400, requestId },
      )
    }

    // Generate stream key
    const streamKey = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stream = await Database.createStream({
      title,
      description: description || "",
      user_id: session.user.id,
      status: "scheduled",
      platform,
      stream_key: streamKey,
      viewer_count: 0,
    })

    return respondSuccess(req, { stream }, { requestId })
  } catch (error) {
    logApiEvent("error", "streams.create.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "create-stream", code: "STREAM_CREATE_FAILED" },
      error,
    })
    return respondError(req, { code: "STREAM_CREATE_FAILED", message: "Unable to create stream." }, { status: 500, requestId })
  }
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const streams = await Database.getUserStreams(session.user.id)
    return respondSuccess(req, { streams }, { requestId })
  } catch (error) {
    logApiEvent("error", "streams.list.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "list-streams", code: "STREAM_LIST_FAILED" },
      error,
    })
    return respondError(req, { code: "STREAM_LIST_FAILED", message: "Unable to load streams." }, { status: 500, requestId })
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
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
