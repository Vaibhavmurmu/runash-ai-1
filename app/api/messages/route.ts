import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { createSessionMessage, isSessionOwnedByUser } from "@/lib/repositories/runash-chat"

import { handleCreateMessage } from "./messages-route-handler"

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  const userId = String(session.user.id)

  return handleCreateMessage(request, {
    getUserId: async () => userId,
    isSessionOwnedByUser,
    createSessionMessage,
  })
}
