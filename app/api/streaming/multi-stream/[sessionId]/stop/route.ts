import { NextResponse, type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { markMultiStreamStopped } from "@/lib/repositories/multi-streaming"

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sessionId } = await params
  const stopped = await markMultiStreamStopped({
    sessionId,
    userId: session.user.id,
  })

  if (!stopped) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
