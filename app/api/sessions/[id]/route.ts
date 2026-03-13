import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { softDeleteSession, updateSession } from "@/lib/repositories/runash-chat"

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => typeof value.title === "string" || typeof value.archived === "boolean", {
    message: "at least one field is required",
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
    return respondError(request, { code: "SESSION_ID_REQUIRED", message: "Session id is required" }, { status: 400, requestId })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const parsedBody = updateSessionSchema.safeParse(body)

    if (!parsedBody.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "title and/or archived is required" }, { status: 400, requestId })
    }

    const updated = await updateSession(parsedParams.data.id, parsedBody.data, userId)
    if (!updated) {
      return respondError(request, { code: "SESSION_NOT_FOUND", message: "Session not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, updated, { requestId })
  } catch (error) {
    logApiEvent("error", "sessions.update.failed", {
      requestId,
      route: "/api/sessions/[id]",
      method: "PATCH",
      details: {},
      error,
    })

    return respondError(request, { code: "SESSION_UPDATE_FAILED", message: "Unable to update session" }, { status: 500, requestId })
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
    return respondError(request, { code: "SESSION_ID_REQUIRED", message: "Session id is required" }, { status: 400, requestId })
  }

  try {
    const deleted = await softDeleteSession(parsedParams.data.id, userId)
    if (!deleted) {
      return respondError(request, { code: "SESSION_NOT_FOUND", message: "Session not found" }, { status: 404, requestId })
    }

    return respondSuccess(request, { id: parsedParams.data.id, deleted: true }, { requestId })
  } catch (error) {
    logApiEvent("error", "sessions.delete.failed", {
      requestId,
      route: "/api/sessions/[id]",
      method: "DELETE",
      details: {},
      error,
    })

    return respondError(request, { code: "SESSION_DELETE_FAILED", message: "Unable to delete session" }, { status: 500, requestId })
  }
}
