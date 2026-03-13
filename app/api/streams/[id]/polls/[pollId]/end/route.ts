import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { endPoll } from "@/lib/live-interactions"

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string; pollId: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const poll = await endPoll(params.id, params.pollId)
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  return NextResponse.json({ poll })
}
