import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { listActiveUserSessions } from "@/lib/auth/session-modes"

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const sessions = await listActiveUserSessions(session.user.id)
  return NextResponse.json({ sessions })
}
