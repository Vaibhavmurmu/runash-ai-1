import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { isSessionOwnedByUser, listSessionMessages } from "../../../../../lib/repositories/runash-chat"

import { handleGetSessionMessages } from "./get-session-messages-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  const userId = String(session.user.id)

  return handleGetSessionMessages(request, params, {
    getUserId: async () => userId,
    isSessionOwnedByUser,
    listSessionMessages,
  })
}
