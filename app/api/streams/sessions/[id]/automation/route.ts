import { randomUUID } from "crypto"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { Database } from "@/lib/database"
import {
  createStreamSessionAutomationEvent,
  listStreamSessionAutomationEvents,
} from "@/lib/repositories/stream-session-automation-events"
import { orchestrateVoiceCommerceTurn } from "@/services/voice-commerce-orchestrator"

const actionSchema = z.object({
  action: z.enum([
    "present_products",
    "answer_buyer_query",
    "trigger_bundle_promotion",
    "trigger_limited_time_discount",
    "initiate_approved_deal",
    "voice_turn",
  ]),
  seller_id: z.string().trim().min(1),
  buyer_id: z.string().trim().min(1),
  buyer_query: z.string().trim().optional(),
  query: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  discount_percent: z.coerce.number().min(0).max(95).optional(),
  requires_broker: z.boolean().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  user_confirmation_after_preview: z.boolean().default(false),
  mfa_verified: z.boolean().default(false),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const events = await listStreamSessionAutomationEvents(params.id)
  return NextResponse.json({ session_id: params.id, events })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream session not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const action = parsed.data.action
  if (action === "voice_turn") {
    const run = await orchestrateVoiceCommerceTurn({
      session_id: params.id,
      stream_id: params.id,
      seller_id: parsed.data.seller_id,
      buyer_id: parsed.data.buyer_id,
      buyer_query: parsed.data.buyer_query ?? parsed.data.query ?? "",
      currency: parsed.data.currency,
      user_confirmation_after_preview: parsed.data.user_confirmation_after_preview,
      mfa_verified: parsed.data.mfa_verified,
    })

    for (const event of run.events) {
      await createStreamSessionAutomationEvent({
        id: event.id,
        sessionId: params.id,
        streamId: params.id,
        eventType: event.type,
        stage: event.stage,
        actorRole: "seller_ai",
        eventPayload: event.payload,
      })
    }

    return NextResponse.json({
      action,
      session_id: params.id,
      recommendations: run.recommendations,
      checkout_action: run.checkout_action,
      negotiation: run.negotiation,
    })
  }

  const eventPayload: Record<string, unknown> = {
    action,
    seller_id: parsed.data.seller_id,
    buyer_id: parsed.data.buyer_id,
    query: parsed.data.query ?? parsed.data.buyer_query ?? null,
    sku: parsed.data.sku ?? null,
    discount_percent: parsed.data.discount_percent ?? null,
    requires_broker: parsed.data.requires_broker ?? false,
  }

  const eventType = `seller_ai.${action}`
  const stage = action === "initiate_approved_deal" ? "final" : "intermediate"

  const persisted = await createStreamSessionAutomationEvent({
    id: `ssa_${randomUUID().replace(/-/g, "")}`,
    sessionId: params.id,
    streamId: params.id,
    eventType,
    stage,
    actorRole: "seller_ai",
    eventPayload,
  })

  return NextResponse.json({
    action,
    session_id: params.id,
    stream_status: stream.status,
    persisted_event: persisted,
  })
}
