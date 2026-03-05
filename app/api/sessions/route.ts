import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { createSession, listSessions } from "@/lib/repositories/runash-chat"

import { handleCreateSession, handleGetSessions } from "./sessions-route-handler"

export async function GET(req: Request) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  const userId = String(session.user.id)

  return handleGetSessions(req, {
    getUserId: async () => userId,
    listSessions,
    createSession,
  })
}

export async function POST(req: Request) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  const userId = String(session.user.id)

  return handleCreateSession(req, {
    getUserId: async () => userId,
    listSessions,
    createSession,
  })
}
