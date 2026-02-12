import { z } from "zod"

import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { createSession, listSessions } from "@/lib/repositories/runash-chat"

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

function getRequestUserId(req: Request) {
  const userId = req.headers.get("x-runash-user-id")
  return typeof userId === "string" ? userId : undefined
}

export async function GET(req: Request) {
  const requestId = resolveRequestId(req)

  try {
    const userId = getRequestUserId(req)
    const sessions = await listSessions(userId)

    logApiEvent("info", "sessions.list.success", {
      requestId,
      route: "/api/sessions",
      method: "GET",
      userId,
      details: { resultCount: sessions.length },
    })

    return respondSuccess(req, sessions, { requestId })
  } catch (error) {
    logApiEvent("error", "sessions.list.failed", {
      requestId,
      route: "/api/sessions",
      method: "GET",
      userId: getRequestUserId(req),
      details: {},
      error,
    })

    return respondError(req, { code: "SESSIONS_LIST_FAILED", message: "Unable to list sessions" }, { status: 500, requestId })
  }
}

export async function POST(req: Request) {
  const requestId = resolveRequestId(req)
  const userId = getRequestUserId(req)

  try {
    const body = await req.json().catch(() => ({}))
    const validation = createSessionSchema.safeParse(body)

    if (!validation.success) {
      logApiEvent("warn", "sessions.create.validation_failed", {
        requestId,
        route: "/api/sessions",
        method: "POST",
        userId,
        details: {
          issues: validation.error.issues,
          body,
        },
      })

      return respondError(
        req,
        { code: "INVALID_REQUEST", message: "title must be a non-empty string" },
        { status: 400, requestId },
      )
    }

    const newSession = await createSession(validation.data.title ?? "Session", userId)

    logApiEvent("info", "sessions.create.success", {
      requestId,
      route: "/api/sessions",
      method: "POST",
      userId,
      details: {
        title: validation.data.title ?? "Session",
        sessionId: newSession.id,
      },
    })

    return respondSuccess(req, newSession, { status: 201, requestId })
  } catch (error) {
    logApiEvent("error", "sessions.create.failed", {
      requestId,
      route: "/api/sessions",
      method: "POST",
      userId,
      details: {},
      error,
    })

    return respondError(req, { code: "SESSION_CREATE_FAILED", message: "Unable to create session" }, { status: 500, requestId })
  }
}
