import { getServerAuthSession } from "@/lib/auth/session"
import { createSessionMessage, isSessionOwnedByUser } from "@/lib/repositories/runash-chat"

import { handleCreateMessage } from "./messages-route-handler"

export async function POST(request: Request) {
  return handleCreateMessage(request, {
    getUserId: async () => {
      const session = await getServerAuthSession()
      return session?.user?.id ? String(session.user.id) : null
    },
    isSessionOwnedByUser,
    createSessionMessage,
  })
}
