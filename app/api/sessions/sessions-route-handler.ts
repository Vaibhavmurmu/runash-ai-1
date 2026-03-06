import { z } from "zod"

import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import {
  createSession,
  listSessions,
  type RunashSession,
  type RunashSessionListCursor,
} from "@/lib/repositories/runash-chat"

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

const querySchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
})

function decodeCursor(cursor: string | undefined): RunashSessionListCursor | null {
  if (!cursor) return null

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as { updatedAt?: string; id?: string }
    if (!decoded?.updatedAt || !decoded?.id) {
      return null
    }

    return {
      updatedAt: String(decoded.updatedAt),
      id: String(decoded.id),
    }
  } catch {
    return null
  }
}

function encodeCursor(session: RunashSession): string {
  return Buffer.from(JSON.stringify({ updatedAt: session.updated_at, id: session.id }), "utf-8").toString("base64url")
}

export type SessionsDependencies = {
  getUserId: () => Promise<string>
  listSessions: (
    userId: string,
    options?: { limit?: number; cursor?: RunashSessionListCursor | null; query?: string },
  ) => Promise<Awaited<ReturnType<typeof listSessions>>>
  createSession: (title: string, userId: string) => Promise<Awaited<ReturnType<typeof createSession>>>
}

export async function handleGetSessions(req: Request, dependencies: SessionsDependencies) {
  const requestId = resolveRequestId(req)
  const resolvedUserId = await dependencies.getUserId()
  const userId = typeof resolvedUserId === "string" ? resolvedUserId.trim() : ""

  if (!userId) {
    return respondError(req, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  try {
    const url = new URL(req.url)
    const parsedQuery = querySchema.safeParse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? 20,
      q: url.searchParams.get("q") ?? undefined,
    })

    if (!parsedQuery.success) {
      return respondError(req, { code: "INVALID_REQUEST", message: "Invalid cursor, limit, or q" }, { status: 400, requestId })
    }

    const parsedCursor = decodeCursor(parsedQuery.data.cursor)
    if (parsedQuery.data.cursor && !parsedCursor) {
      return respondError(req, { code: "INVALID_REQUEST", message: "Invalid cursor, limit, or q" }, { status: 400, requestId })
    }

    const sessions = await dependencies.listSessions(userId, {
      cursor: parsedCursor,
      limit: parsedQuery.data.limit,
      query: parsedQuery.data.q,
    })
    const nextCursor = sessions.length === parsedQuery.data.limit ? encodeCursor(sessions[sessions.length - 1]) : null

    logApiEvent("info", "sessions.list.success", {
      requestId,
      route: "/api/sessions",
      method: "GET",
      userId,
      details: { resultCount: sessions.length, limit: parsedQuery.data.limit, hasQuery: Boolean(parsedQuery.data.q) },
    })

    return respondSuccess(req, { items: sessions, nextCursor }, { requestId })
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
  const resolvedUserId = await dependencies.getUserId()
  const userId = typeof resolvedUserId === "string" ? resolvedUserId.trim() : ""

  if (!userId) {
    return respondError(req, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

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
