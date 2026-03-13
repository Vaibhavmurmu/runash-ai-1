import { NextRequest, NextResponse } from "next/server"
import { addMessage } from "@/lib/chat"
import { applyPollQuizAction } from "@/lib/poll-quiz"

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; pollId: string }> }) {
  const params = await context.params
  const body = await req.json()
  const action = body?.action === "close" ? "close" : body?.action === "start" ? "start" : null

  if (!action) {
    return NextResponse.json({ error: "action must be start or close" }, { status: 400 })
  }

  const poll = applyPollQuizAction(params.id, { type: action, pollId: params.pollId })
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  try {
    await addMessage({
      streamId: params.id,
      userId: "system",
      username: "System",
      text: `${poll.kind === "quiz" ? "Quiz" : "Poll"} ${action}ed: ${poll.question}`,
    })
  } catch {
    // no-op
  }

  return NextResponse.json({ item: poll })
}
