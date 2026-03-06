import type { RunashSessionMessage } from "../../../../../lib/repositories/runash-chat"
import { logApiEvent } from "../../../../../lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "../../../../../lib/api/response"
import { z } from "zod"

type ApiError = {
  code: string
  message: string
}

const DEFAULT_LIMIT = 4
const MAX_LIMIT = 50

const sessionParamsSchema = z.object({
  id: z.string().trim().min(1),
})

const sessionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
})

export type SessionMessagesDependencies = {
  getUserId: () => Promise<string>
  isSessionOwnedByUser: (sessionId: string, userId: string) => Promise<boolean>
  listSessionMessages: (sessionId: string, limit: number, userId: string) => Promise<RunashSessionMessage[]>
}

function isSessionAccessDeniedError(error: unknown) {
  return error instanceof Error && error.message === "SESSION_ACCESS_DENIED"
}


export async function handleGetSessionMessages(
  request: Request,
  params: { id: string },
  dependencies: SessionMessagesDependencies,
) {
  const requestId = resolveRequestId(request)

  try {
    const userId = await dependencies.getUserId()

    const parsedParams = sessionParamsSchema.safeParse(params)
    if (!parsedParams.success) {
      logApiEvent("warn", "session.messages.validation_failed", {
        requestId,
        route: "/api/messages/session/[id]",
        method: "GET",
        details: { reason: "missing_session_id" },
      })

      return respondError(
        request,
        {
          code: "SESSION_ID_REQUIRED",
          message: "Session id is required",
        } satisfies ApiError,
        { status: 400, requestId },
      )
    }

    const url = new URL(request.url)
    const parsedQuery = sessionQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? DEFAULT_LIMIT,
    })

    if (!parsedQuery.success) {
      return respondError(
        request,
        {
          code: "INVALID_LIMIT",
          message: "limit must be a positive integer",
        } satisfies ApiError,
        { status: 400, requestId },
      )
    }

    const { id: sessionId } = parsedParams.data
    const { limit } = parsedQuery.data

    const isOwned = await dependencies.isSessionOwnedByUser(sessionId, userId)
    if (!isOwned) {
      return respondError(
        request,
        {
          code: "SESSION_ACCESS_DENIED",
          message: "Forbidden",
        } satisfies ApiError,
        { status: 403, requestId },
      )
    }

    const messages = await dependencies.listSessionMessages(sessionId, limit, userId)

    logApiEvent("info", "session.messages.fetch_success", {
      requestId,
      route: "/api/messages/session/[id]",
      method: "GET",
      details: { sessionId, limit, resultCount: messages.length },
    })

    return respondSuccess(request, messages, { requestId })
  } catch (error) {
    if (isSessionAccessDeniedError(error)) {
      return respondError(
        request,
        {
          code: "SESSION_ACCESS_DENIED",
          message: "Forbidden",
        } satisfies ApiError,
        { status: 403, requestId },
      )
    }

    logApiEvent("error", "session.messages.fetch_failed", {
      requestId,
      route: "/api/messages/session/[id]",
      method: "GET",
      details: {},
      error,
    })

    return respondError(
      request,
      {
        code: "SESSION_MESSAGES_FETCH_FAILED",
        message: "Unable to fetch session messages",
      } satisfies ApiError,
      { status: 500, requestId },
    )
  }
}
