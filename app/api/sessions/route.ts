import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
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
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
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
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  return handleCreateSession(req, {
    getUserId: async () => userId,
    listSessions,
    createSession,
  })
}
