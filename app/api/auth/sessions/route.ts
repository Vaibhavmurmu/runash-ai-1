import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { handleListSessions, handleRevokeSessions } from "./sessions-route-handler"

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  return handleListSessions(session?.user ? { id: session.user.id } : null)
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  return handleRevokeSessions(request, session?.user ? { id: session.user.id } : null)
}
