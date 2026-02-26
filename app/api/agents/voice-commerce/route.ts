import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import {
  createStreamSessionAutomationEvent,
  listStreamSessionAutomationEvents,
} from "@/lib/repositories/stream-session-automation-events"
import { orchestrateVoiceCommerceTurn } from "@/services/voice-commerce-orchestrator"

const voiceTurnSchema = z.object({
  session_id: z.string().trim().min(1),
  stream_id: z.string().trim().optional(),
  buyer_id: z.string().trim().min(1),
  buyer_query: z.string().trim().min(1),
  spoken_text: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  user_confirmation_after_preview: z.boolean().default(false),
  mfa_verified: z.boolean().default(false),
  response_mode: z.enum(["sse", "json"]).default("sse"),
})

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionId = request.nextUrl.searchParams.get("session_id")
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 })
  }

  const events = await listStreamSessionAutomationEvents(sessionId)
  return NextResponse.json({ session_id: sessionId, events })
}

export async function POST(request: NextRequest) {
  const authSession = await getServerAuthSession()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json().catch(() => ({}))
  const parsed = voiceTurnSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const run = await orchestrateVoiceCommerceTurn({
    ...parsed.data,
    seller_id: String(authSession.user.id),
  })

  for (const event of run.events) {
    await createStreamSessionAutomationEvent({
      id: event.id,
      sessionId: run.session_id,
      streamId: run.stream_id,
      eventType: event.type,
      stage: event.stage,
      actorRole: "seller_ai",
      eventPayload: event.payload,
    })
  }

  if (parsed.data.response_mode === "json") {
    return NextResponse.json({
      contract: "voice-commerce-turn.v1",
      session_id: run.session_id,
      stream_id: run.stream_id,
      recommendations: run.events.filter((event) => event.stage === "intermediate"),
      final_checkout_action: run.checkout_action,
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const push = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      push("meta", {
        contract: "voice-commerce-turn.v1",
        stream_safe: true,
        session_id: run.session_id,
        stream_id: run.stream_id,
      })

      run.events.forEach((event) => {
        const eventName = event.stage === "final" ? "final_checkout_action" : "recommendation"
        push(eventName, {
          id: event.id,
          type: event.type,
          stage: event.stage,
          payload: event.payload,
        })
      })

      push("done", {
        session_id: run.session_id,
        final_checkout_action: run.checkout_action,
      })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
