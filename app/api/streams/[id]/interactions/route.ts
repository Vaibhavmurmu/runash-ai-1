import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { getInteractionState, listPolls, listQASessions, listQuestions, updateInteractionState } from "@/lib/live-interactions"

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const state = await getInteractionState(params.id)
  const [polls, qaSessions, questions] = await Promise.all([
    listPolls(params.id),
    listQASessions(params.id),
    listQuestions(params.id),
  ])

  return NextResponse.json({
    state,
    polls,
    qaSessions,
    questions,
  })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as
    | { reactionsEnabled?: boolean; memberOnly?: boolean; pinnedMessageId?: string | null }
    | null

  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const updated = await updateInteractionState(params.id, {
    reactionsEnabled: typeof body.reactionsEnabled === "boolean" ? body.reactionsEnabled : undefined,
    memberOnly: typeof body.memberOnly === "boolean" ? body.memberOnly : undefined,
    pinnedMessageId: body.pinnedMessageId ?? undefined,
  })

  return NextResponse.json({ state: updated })
}
