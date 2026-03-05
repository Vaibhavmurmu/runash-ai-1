import { getServerAuthSession } from "@/lib/auth/session"
import { isSessionOwnedByUser, listSessionMessages } from "../../../../../lib/repositories/runash-chat"

import { handleGetSessionMessages } from "./get-session-messages-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleGetSessionMessages(request, params, {
    getUserId: async () => {
      const session = await getServerAuthSession()
      return session?.user?.id ? String(session.user.id) : null
    },
    isSessionOwnedByUser,
    listSessionMessages,
  })
}
