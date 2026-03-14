import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CHAT_ERROR_CODES } from "@/lib/chat-contracts"
import { isSessionOwnedByUser, listSessionMessages } from "../../../../../lib/repositories/runash-chat"

import { handleGetSessionMessages } from "./get-session-messages-handler"
async function requireAuthenticatedUserId() {
  const session = await getServerAuthSession()
  return session?.user?.id ? String(session.user.id) : null
}


export async function GET(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const userId = await requireAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", code: CHAT_ERROR_CODES.AUTH_REQUIRED }, { status: 401 })
  }

  return handleGetSessionMessages(request, params, {
    getUserId: async () => userId,
    isSessionOwnedByUser,
    listSessionMessages,
  })
}
