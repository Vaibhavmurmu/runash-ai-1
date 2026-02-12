import { logApiEvent } from "../../../../lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "../../../../lib/api/response"
import type { RunashSession } from "../../../../lib/repositories/runash-chat"

type ApiError = {
  code: string
  message: string
}

export type RecentSessionDependencies = {
  getMostRecentSession: () => Promise<RunashSession | null>
}

export async function handleGetRecentSession(request: Request, dependencies: RecentSessionDependencies) {
  const requestId = resolveRequestId(request)

  try {
    const session = await dependencies.getMostRecentSession()

    if (!session) {
      logApiEvent("warn", "sessions.recent.not_found", {
        requestId,
        route: "/api/sessions/recent",
        method: "GET",
      })

      return respondError(
        request,
        {
          code: "SESSION_NOT_FOUND",
          message: "No recent session exists",
        } satisfies ApiError,
        { status: 404, requestId },
      )
    }

    logApiEvent("info", "sessions.recent.success", {
      requestId,
      route: "/api/sessions/recent",
      method: "GET",
      details: { sessionId: session.id },
    })

    return respondSuccess(request, session, { requestId })
  } catch (error) {
    logApiEvent("error", "sessions.recent.failed", {
      requestId,
      route: "/api/sessions/recent",
      method: "GET",
      details: {},
      error,
    })

    return respondError(
      request,
      {
        code: "SESSION_RECENT_FETCH_FAILED",
        message: "Unable to fetch the recent session",
      } satisfies ApiError,
      { status: 500, requestId },
    )
  }
}
