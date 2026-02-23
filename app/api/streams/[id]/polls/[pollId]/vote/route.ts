import { NextRequest, NextResponse } from "next/server"
import { addMessage } from "@/lib/chat"
import { applyPollQuizAction, getPollQuizzes } from "@/lib/poll-quiz"

export async function POST(req: NextRequest, { params }: { params: { id: string; pollId: string } }) {
  const body = await req.json()
  const optionId = typeof body?.optionId === "string" ? body.optionId : ""

  if (!optionId) {
    return NextResponse.json({ error: "optionId is required" }, { status: 400 })
  }

  const poll = applyPollQuizAction(params.id, { type: "vote", pollId: params.pollId, optionId })
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  const selected = poll.options.find((option) => option.id === optionId)
  if (selected) {
    try {
      await addMessage({
        streamId: params.id,
        userId: "system",
        username: "System",
        text: `New vote on ${poll.kind}: ${selected.text}`,
      })
    } catch {
      // no-op
    }
  }

  return NextResponse.json({ item: poll, all: getPollQuizzes(params.id) })
}
