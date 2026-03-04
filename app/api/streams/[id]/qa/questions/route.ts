import { type NextRequest, NextResponse } from "next/server"
import { listQuestions, submitQuestion } from "@/lib/live-interactions"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const questions = await listQuestions(params.id)
  return NextResponse.json({ questions })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => null)) as { username?: string; text?: string } | null
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 })
  }

  const question = await submitQuestion(params.id, body.username?.trim() || "Viewer", body.text.trim())
  return NextResponse.json({ question }, { status: 201 })
}
