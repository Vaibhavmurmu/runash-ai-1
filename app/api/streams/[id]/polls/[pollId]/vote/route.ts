import { type NextRequest, NextResponse } from "next/server"
import { votePoll } from "@/lib/live-interactions"

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; pollId: string }> }) {
  const params = await context.params
  const body = (await req.json().catch(() => null)) as { optionId?: string } | null

  if (!body?.optionId) {
    return NextResponse.json({ error: "optionId is required" }, { status: 400 })
  }

  const poll = await votePoll(params.id, params.pollId, body.optionId)
  if (!poll) {
    return NextResponse.json({ error: "Poll or option not found" }, { status: 404 })
  }

  return NextResponse.json({ poll })
}
