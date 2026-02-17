import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"

import { resolveRequestId } from "@/lib/api/response"
import { createFeedbackRecord } from "@/lib/repositories/agent-orchestration"

const feedbackSchema = z.object({
  sessionId: z.string().trim().min(1),
  messageId: z.string().trim().min(1).optional(),
  signal: z.enum(["quality", "safety"]),
  score: z.number().int().min(1).max(5),
  reason: z.string().trim().max(500).optional(),
})

const AGENT_CHAT_ENABLED = process.env.RUNASH_AGENT_CHAT_ENABLED !== "false"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  if (!AGENT_CHAT_ENABLED) {
    return NextResponse.json({ error: "Agent APIs disabled", requestId }, { status: 404 })
  }

  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = feedbackSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback payload", details: parsed.error.flatten(), requestId }, { status: 400 })
  }

  const feedback = await createFeedbackRecord({
    session_id: parsed.data.sessionId,
    message_id: parsed.data.messageId,
    signal: parsed.data.signal,
    score: parsed.data.score,
    reason: parsed.data.reason,
  })

  return NextResponse.json({ success: true, requestId, data: feedback }, { status: 201 })
}
