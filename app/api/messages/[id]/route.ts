import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { deleteSessionMessage, isSessionOwnedByUser, updateSessionMessage } from "@/lib/repositories/runash-chat"

const updateMessageSchema = z.object({
  sessionId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(6000),
})

const deleteMessageSchema = z.object({
  sessionId: z.string().trim().min(1),
})

type RouteContext = {
  params: {
    id: string
  }
}

async function getAuthenticatedUserId() {
  const session = await getServerAuthSession()
  return session?.user?.id ? String(session.user.id) : null
}

function isSessionAccessDeniedError(error: unknown) {
  return error instanceof Error && error.message === "SESSION_ACCESS_DENIED"
}


export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = resolveRequestId(request)
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = updateMessageSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(
        request,
        { code: "INVALID_REQUEST", message: "sessionId and content are required" },
        { status: 400, requestId },
      )
    }

    const isOwned = await isSessionOwnedByUser(parsed.data.sessionId, userId)
    if (!isOwned) {
      return respondError(
        request,
        { code: "SESSION_ACCESS_DENIED", message: "Forbidden" },
        { status: 403, requestId },
      )
    }

    const message = await updateSessionMessage(parsed.data.sessionId, params.id, parsed.data.content, userId)

    if (!message) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, message, { status: 200, requestId })
  } catch (error) {
    if (isSessionAccessDeniedError(error)) {
      return respondError(request, { code: "SESSION_ACCESS_DENIED", message: "Forbidden" }, { status: 403, requestId })
    }

    logApiEvent("error", "messages.update.failed", {
      requestId,
      route: "/api/messages/[id]",
      method: "PATCH",
      details: {},
      error,
    })

    return respondError(request, { code: "MESSAGE_UPDATE_FAILED", message: "Unable to update message" }, { status: 500, requestId })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = resolveRequestId(request)
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = deleteMessageSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "sessionId is required" }, { status: 400, requestId })
    }

    const isOwned = await isSessionOwnedByUser(parsed.data.sessionId, userId)
    if (!isOwned) {
      return respondError(
        request,
        { code: "SESSION_ACCESS_DENIED", message: "Forbidden" },
        { status: 403, requestId },
      )
    }

    const deleted = await deleteSessionMessage(parsed.data.sessionId, params.id, userId)

    if (!deleted) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, { id: params.id, deleted: true }, { status: 200, requestId })
  } catch (error) {
    if (isSessionAccessDeniedError(error)) {
      return respondError(request, { code: "SESSION_ACCESS_DENIED", message: "Forbidden" }, { status: 403, requestId })
    }

    logApiEvent("error", "messages.delete.failed", {
      requestId,
      route: "/api/messages/[id]",
      method: "DELETE",
      details: {},
      error,
    })

    return respondError(request, { code: "MESSAGE_DELETE_FAILED", message: "Unable to delete message" }, { status: 500, requestId })
  }
}
