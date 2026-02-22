import { NextRequest, NextResponse } from "next/server"
import { addMessage } from "@/lib/chat"
import { createPollQuiz, getPollQuizzes } from "@/lib/poll-quiz"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ items: getPollQuizzes(params.id) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const question = typeof body?.question === "string" ? body.question.trim() : ""
  const kind = body?.kind === "quiz" ? "quiz" : "poll"
  const options = Array.isArray(body?.options)
    ? body.options
        .map((option: { text?: string; isCorrect?: boolean }) => ({
          text: option?.text?.trim() ?? "",
          isCorrect: Boolean(option?.isCorrect),
        }))
        .filter((option: { text: string }) => option.text.length > 0)
    : []

  if (!question || options.length < 2) {
    return NextResponse.json({ error: "Question and at least two options are required." }, { status: 400 })
  }

  const created = createPollQuiz({ streamId: params.id, kind, question, options })

  try {
    await addMessage({
      streamId: params.id,
      userId: "system",
      username: "System",
      text: `${kind === "quiz" ? "Quiz" : "Poll"} created: ${question}`,
    })
  } catch {
    // no-op
  }

  return NextResponse.json({ item: created }, { status: 201 })
}
