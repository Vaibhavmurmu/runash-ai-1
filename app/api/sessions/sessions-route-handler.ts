import { z } from "zod"

import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { createSession, listSessions } from "@/lib/repositories/runash-chat"

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

export type SessionsDependencies = {
  getUserId: () => Promise<string>
  listSessions: (userId: string) => Promise<Awaited<ReturnType<typeof listSessions>>>
  createSession: (title: string, userId: string) => Promise<Awaited<ReturnType<typeof createSession>>>
}

export async function handleGetSessions(req: Request, dependencies: SessionsDependencies) {
  const requestId = resolveRequestId(req)
  const userId = await dependencies.getUserId()

  try {
    const sessions = await dependencies.listSessions(userId)

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
      userId,
      details: {},
      error,
    })

    return respondError(req, { code: "SESSIONS_LIST_FAILED", message: "Unable to list sessions" }, { status: 500, requestId })
  }
}

export async function handleCreateSession(req: Request, dependencies: SessionsDependencies) {
  const requestId = resolveRequestId(req)
  const userId = await dependencies.getUserId()

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

    const newSession = await dependencies.createSession(validation.data.title ?? "Session", userId)

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
