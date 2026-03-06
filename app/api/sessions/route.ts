import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, resolveRequestId } from "@/lib/api/response"
import { createSession, listSessions } from "@/lib/repositories/runash-chat"

import { handleCreateSession, handleGetSessions } from "./sessions-route-handler"
async function requireAuthenticatedUserId() {
  const session = await getServerAuthSession()
  const userId = String(session?.user?.id ?? "").trim()
  return userId || null
}

export async function GET(req: Request) {
  const userId = await requireAuthenticatedUserId()
  if (!userId) {
    return respondError(req, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId: resolveRequestId(req) })
  }

  return handleGetSessions(req, {
    getUserId: async () => userId,
    listSessions,
    createSession,
  })
}

export async function POST(req: Request) {
  const userId = await requireAuthenticatedUserId()
  if (!userId) {
    return respondError(req, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId: resolveRequestId(req) })
  }

  return handleCreateSession(req, {
    getUserId: async () => userId,
    listSessions,
    createSession,
  })
}
