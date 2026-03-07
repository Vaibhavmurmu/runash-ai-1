import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { getMostRecentSession } from "../../../../lib/repositories/runash-chat"

import { handleGetRecentSession } from "./get-recent-session-handler"

export async function GET(req: Request) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  const userId = String(session.user.id)

  return handleGetRecentSession(req, {
    getMostRecentSession: () => getMostRecentSession(userId),
  })
}
