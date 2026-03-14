import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { deleteSessionMessage, getMessageByIdForUser, updateSessionMessage } from "@/lib/repositories/runash-chat"

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const updateMessageSchema = z.object({
  content: z.string().trim().min(1).max(6000),
})

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getAuthenticatedUserId() {
  const session = await getServerAuthSession()
  return session?.user?.id ? String(session.user.id) : null
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const resolvedParams = await params
  const requestId = resolveRequestId(request)
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  const parsedParams = paramsSchema.safeParse(resolvedParams)
  if (!parsedParams.success) {
    return respondError(request, { code: "MESSAGE_ID_REQUIRED", message: "Message id is required" }, { status: 400, requestId })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = updateMessageSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(
        request,
        { code: "INVALID_REQUEST", message: "content is required" },
        { status: 400, requestId },
      )
    }

    const target = await getMessageByIdForUser(parsedParams.data.id, userId)
    if (!target) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    if (target.role !== "user") {
      return respondError(request, { code: "MESSAGE_EDIT_NOT_ALLOWED", message: "Only user messages can be edited" }, { status: 409, requestId })
    }

    const message = await updateSessionMessage(target.session_id, parsedParams.data.id, parsed.data.content, userId)

    if (!message) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, message, { status: 200, requestId })
  } catch (error) {
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
  const resolvedParams = await params
  const requestId = resolveRequestId(request)
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  const parsedParams = paramsSchema.safeParse(resolvedParams)
  if (!parsedParams.success) {
    return respondError(request, { code: "MESSAGE_ID_REQUIRED", message: "Message id is required" }, { status: 400, requestId })
  }

  try {
    const target = await getMessageByIdForUser(parsedParams.data.id, userId)
    if (!target) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    const deleted = await deleteSessionMessage(target.session_id, parsedParams.data.id, userId)

    if (!deleted) {
      return respondError(request, { code: "MESSAGE_NOT_FOUND", message: "Message not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, { id: parsedParams.data.id, deleted: true }, { status: 200, requestId })
  } catch (error) {
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
