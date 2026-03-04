import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { endQASession } from "@/lib/live-interactions"

export async function POST(_req: NextRequest, { params }: { params: { id: string; sessionId: string } }) {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const qaSession = await endQASession(params.id, params.sessionId)
  if (!qaSession) {
    return NextResponse.json({ error: "Q&A session not found" }, { status: 404 })
  }

  return NextResponse.json({ session: qaSession })
}
