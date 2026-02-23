import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { createPoll, listPolls } from "@/lib/live-interactions"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const polls = await listPolls(params.id)
  return NextResponse.json({ polls })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { question?: string; options?: string[] } | null
  if (!body?.question?.trim() || !Array.isArray(body.options) || body.options.length < 2) {
    return NextResponse.json({ error: "question and at least 2 options are required" }, { status: 400 })
  }

  const cleanOptions = body.options.map((option) => option.trim()).filter(Boolean).slice(0, 6)
  if (cleanOptions.length < 2) {
    return NextResponse.json({ error: "at least 2 valid options are required" }, { status: 400 })
  }

  const poll = await createPoll(params.id, body.question.trim(), cleanOptions)
  return NextResponse.json({ poll }, { status: 201 })
}
