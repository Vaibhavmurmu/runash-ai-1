import { randomUUID } from "crypto"

import { z } from "zod"

import { relayAgentSkillModules } from "@/lib/skills/relay-tool-registry"
import { brokerMediatedSettlement, counterOffer, createInitialQuote } from "@/services/deal-negotiation-service"

const turnInputSchema = z.object({
  session_id: z.string().trim().min(1),
  stream_id: z.string().trim().optional(),
  tenant_id: z.string().trim().optional(),
  merchant_id: z.string().trim().optional(),
  seller_id: z.string().trim().min(1),
  buyer_id: z.string().trim().min(1),
  buyer_query: z.string().trim().min(1),
  spoken_text: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  discount_floor_percent: z.number().min(0).max(90).default(8),
  discount_ceiling_percent: z.number().min(0).max(95).default(20),
  require_broker_above_discount_percent: z.number().min(0).max(99).default(15),
  preview_displayed: z.boolean().default(true),
  user_confirmation_after_preview: z.boolean().default(false),
  mfa_verified: z.boolean().default(false),
  shipping_country: z.string().trim().min(2).max(3).default("US"),
  shipping_region: z.string().trim().max(30).optional(),
})

export type VoiceTurnInput = z.infer<typeof turnInputSchema>

type VoiceAutomationEvent = {
  id: string
  type: string
  stage: "intermediate" | "final"
  created_at: string
  payload: Record<string, unknown>
}

export type VoiceOrchestrationResult = {
  session_id: string
  stream_id?: string
  intent: {
    name: "buy_now" | "negotiate" | "query" | "unknown"
    confidence: number
    normalized_query: string
  }
  recommendations: Array<{
    product_id: string
    sku: string
    name: string
    ranking_score: number
    normalized_amount: number
    normalized_currency: string
    tradeoffs: string[]
  }>
  negotiation: Record<string, unknown>
  checkout_action: Record<string, unknown> | null
  events: VoiceAutomationEvent[]
}

function inferIntent(query: string): VoiceOrchestrationResult["intent"] {
  const lowered = query.toLowerCase()
  if (/(buy|checkout|pay|purchase|take it|book now)/.test(lowered)) {
    return { name: "buy_now", confidence: 0.93, normalized_query: lowered }
  }
  if (/(discount|deal|counter|offer|negotiate|price)/.test(lowered)) {
    return { name: "negotiate", confidence: 0.88, normalized_query: lowered }
  }
  if (lowered.length > 0) {
    return { name: "query", confidence: 0.8, normalized_query: lowered }
  }
  return { name: "unknown", confidence: 0.5, normalized_query: "" }
}

function createEvent(type: string, stage: VoiceAutomationEvent["stage"], payload: Record<string, unknown>): VoiceAutomationEvent {
  return {
    id: `vce_${randomUUID().replace(/-/g, "")}`,
    type,
    stage,
    created_at: new Date().toISOString(),
    payload,
  }
}

export async function orchestrateVoiceCommerceTurn(rawInput: unknown): Promise<VoiceOrchestrationResult> {
  const input = turnInputSchema.parse(rawInput)
  const events: VoiceAutomationEvent[] = []

  const intent = inferIntent(input.spoken_text || input.buyer_query)
  events.push(createEvent("voice.intent_extracted", "intermediate", { intent }))

  const search = (await relayAgentSkillModules.buyer_product_search.execute({
    query: input.buyer_query,
    tenant_id: input.tenant_id,
    merchant_id: input.merchant_id,
    user_currency: input.currency,
    max_results: 5,
  })) as {
    results?: Array<{
      product_id: string
      sku: string
      name: string
      ranking_score: number
      price: { normalized_amount: number; normalized_currency: string }
      reasons: { tradeoffs: string[] }
    }>
  }

  const recommendations = (search.results ?? []).map((entry) => ({
    product_id: entry.product_id,
    sku: entry.sku,
    name: entry.name,
    ranking_score: entry.ranking_score,
    normalized_amount: entry.price.normalized_amount,
    normalized_currency: entry.price.normalized_currency,
    tradeoffs: entry.reasons.tradeoffs,
  }))

  events.push(
    createEvent("voice.recommendations_ready", "intermediate", {
      count: recommendations.length,
      recommendations,
    }),
  )

  const top = recommendations[0]
  if (!top) {
    const noResult = {
      session_id: input.session_id,
      stream_id: input.stream_id,
      intent,
      recommendations,
      negotiation: { status: "no_match" },
      checkout_action: null,
      events,
    }
    events.push(createEvent("voice.turn_resolved", "final", { status: "no_match" }))
    return noResult
  }

  const listPriceMinor = Math.max(1, Math.round(top.normalized_amount))
  const initialQuoteMinor = Math.max(1, Math.round(listPriceMinor * (1 - input.discount_floor_percent / 100)))

  const initial = await createInitialQuote({
    tenantId: input.tenant_id ?? input.seller_id,
    sellerId: input.seller_id,
    buyerId: input.buyer_id,
    sku: top.sku,
    quantity: 1,
    currency: input.currency.toUpperCase(),
    listPriceMinor,
    quoteAmountMinor: initialQuoteMinor,
    metadata: {
      stream_id: input.stream_id,
      source: "voice_commerce_orchestrator",
    },
  })

  let negotiation: Record<string, unknown> = initial
  events.push(createEvent("voice.negotiation_started", "intermediate", { negotiation }))

  const discountPercent = Number(initial.discount_percent ?? input.discount_floor_percent)
  if (discountPercent >= input.require_broker_above_discount_percent) {
    const brokerAmountMinor = Math.max(1, Math.round(listPriceMinor * (1 - input.discount_ceiling_percent / 100)))
    const broker = await brokerMediatedSettlement({
      dealId: String(initial.deal_id),
      brokerId: `${input.seller_id}:broker`,
      settlementAmountMinor: brokerAmountMinor,
      reason: "high_discount_request",
      metadata: { stream_id: input.stream_id, automation: true },
    })
    negotiation = { ...negotiation, broker }
    events.push(createEvent("voice.broker_mediation", "intermediate", { broker }))
  } else {
    const counter = await counterOffer({
      dealId: String(initial.deal_id),
      actorRole: "buyer",
      amountMinor: initialQuoteMinor,
      metadata: { accepted_by_voice_flow: true, stream_id: input.stream_id },
    })
    negotiation = { ...negotiation, counter }
    events.push(createEvent("voice.counter_offer", "intermediate", { counter }))
  }

  const checkoutAction = (await relayAgentSkillModules.initiate_link_checkout.execute({
    merchant_id: input.seller_id,
    amount: listPriceMinor,
    currency: input.currency.toUpperCase(),
    country: input.shipping_country,
    region: input.shipping_region,
    product_metadata: {
      name: top.name,
      sku: top.sku,
      category: "voice-commerce",
      tags: ["voice", "instant-checkout", "runashchat"],
    },
    session_context: {
      session_id: input.session_id,
      stream_id: input.stream_id,
      deal_id: initial.deal_id,
    },
    preview_displayed: input.preview_displayed,
    user_confirmation_after_preview: input.user_confirmation_after_preview,
    human_confirmed: input.user_confirmation_after_preview,
    mfa_verified: input.mfa_verified,
    idempotency_key: `voice-checkout-${input.session_id}-${top.sku}`,
  })) as Record<string, unknown>

  events.push(
    createEvent("voice.checkout_handoff", "final", {
      status: checkoutAction.status ?? "submitted",
      checkout_session_id: checkoutAction.checkout_session_id ?? null,
      provider: checkoutAction.provider ?? "stripe_link",
    }),
  )

  return {
    session_id: input.session_id,
    stream_id: input.stream_id,
    intent,
    recommendations,
    negotiation,
    checkout_action: checkoutAction,
    events,
  }
}
