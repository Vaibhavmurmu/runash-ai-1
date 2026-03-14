import { randomUUID } from "crypto"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { Database } from "@/lib/database"
import {
  createStreamSessionAutomationEvent,
  listStreamSessionAutomationEvents,
} from "@/lib/repositories/stream-session-automation-events"
import { orchestrateVoiceCommerceTurn } from "@/services/voice-commerce-orchestrator"
import { orchestrateNetworkQualityAutomation } from "@/services/agent-orchestration-service"

const actionSchema = z.object({
  action: z.enum([
    "present_products",
    "answer_buyer_query",
    "trigger_bundle_promotion",
    "trigger_limited_time_discount",
    "initiate_approved_deal",
    "voice_turn",
    "network_quality_degraded",
    "network_quality_recovered",
  ]),
  seller_id: z.string().trim().min(1).optional(),
  buyer_id: z.string().trim().min(1).optional(),
  buyer_query: z.string().trim().optional(),
  query: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  discount_percent: z.coerce.number().min(0).max(95).optional(),
  requires_broker: z.boolean().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  user_confirmation_after_preview: z.boolean().default(false),
  mfa_verified: z.boolean().default(false),
})

export async function GET(_: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const events = await listStreamSessionAutomationEvents(params.id)
  return NextResponse.json({ session_id: params.id, events })
}

export async function POST(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream session not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const action = parsed.data.action

  if (action === "network_quality_degraded" || action === "network_quality_recovered") {
    const events = await listStreamSessionAutomationEvents(params.id)
    const prior = events
      .filter((event) => event.eventType === "stream_automation.state_snapshot")
      .at(-1)?.eventPayload

    const state = prior && typeof prior === "object" ? (prior as Record<string, unknown>) : undefined
    const result = await orchestrateNetworkQualityAutomation({
      sessionId: params.id,
      streamId: params.id,
      trigger: action,
      actorRole: "seller_ai",
      state: state as Parameters<typeof orchestrateNetworkQualityAutomation>[0]["state"],
    })

    const snapshot = await createStreamSessionAutomationEvent({
      id: `ssa_${randomUUID().replace(/-/g, "")}`,
      sessionId: params.id,
      streamId: params.id,
      eventType: "stream_automation.state_snapshot",
      stage: "intermediate",
      actorRole: "seller_ai",
      eventPayload: result.state as Record<string, unknown>,
    })

    return NextResponse.json({
      action,
      session_id: params.id,
      trigger: result.trigger,
      automation_timeline: result.timeline,
      automation_state: result.state,
      state_snapshot: snapshot,
    })
  }

  if (action !== "network_quality_degraded" && action !== "network_quality_recovered") {
    if (!parsed.data.seller_id || !parsed.data.buyer_id) {
      return NextResponse.json({ error: "seller_id and buyer_id are required for this action" }, { status: 400 })
    }
  }

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
