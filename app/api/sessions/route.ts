import { getServerAuthSession } from "@/lib/auth/session"
import { createSession, listSessions } from "@/lib/repositories/runash-chat"

import { handleCreateSession, handleGetSessions } from "./sessions-route-handler"

export async function GET(req: Request) {
  return handleGetSessions(req, {
    getUserId: async () => {
      const session = await getServerAuthSession()
      return session?.user?.id ? String(session.user.id) : null
    },
    listSessions,
    createSession,
  })
}

export async function POST(req: Request) {
  return handleCreateSession(req, {
    getUserId: async () => {
      const session = await getServerAuthSession()
      return session?.user?.id ? String(session.user.id) : null
    },
    listSessions,
    createSession,
  })
}
