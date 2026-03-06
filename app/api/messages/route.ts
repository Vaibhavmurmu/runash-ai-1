import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { createSessionMessage, isSessionOwnedByUser } from "@/lib/repositories/runash-chat"

import { handleCreateMessage } from "./messages-route-handler"
async function requireAuthenticatedUserId() {
  const session = await getServerAuthSession()
  const userId = String(session?.user?.id ?? "").trim()
  return userId || null
}

export async function POST(request: Request) {
  const userId = await requireAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  return handleCreateMessage(request, {
    getUserId: async () => userId,
    isSessionOwnedByUser,
    createSessionMessage,
  })
}
