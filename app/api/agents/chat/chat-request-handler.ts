import { relayToolExecutionMode, type RelayAgentTool } from "@/lib/skills/relay-tool-registry"
import { createHash } from "crypto"
import {
  CheckoutContextResolutionError,
  resolveCheckoutHandoffContext,
  type CheckoutCanonicalSessionInput,
} from "@/lib/services/checkout-handoff-context-resolver"
import type { ServerAuthSession } from "@/lib/auth/session"

const INSTANT_CHECKOUT_INTENT = /\b(buy this|confirm purchase|pay now|instant checkout|checkout|confirm)\b/i
const SEARCH_INTENT = /search|find|best(?:\s+under)?|compare|web|under\s+\$?\d+/i
const BUYER_PRODUCT_SEARCH_INTENT = /\b(find|compare|best under|under)\b/i
const NON_PRODUCTION_CHECKOUT_FALLBACK = process.env.RUNASH_ALLOW_NON_PRODUCTION_CHECKOUT_FALLBACK === "true"

type CheckoutHandoffInput = {
  message: string
  sessionId: string
  canonical?: CheckoutCanonicalSessionInput
  authSession?: ServerAuthSession | null
  merchantId?: string
  merchantEntityId?: string
  merchantCountry?: string
}

export type CheckoutValidationRemediation = {
  missing_fields: string[]
  next_action: string
}

export type CheckoutGateEvaluation =
  | {
      canInitiateCheckout: true
    }
  | {
      canInitiateCheckout: false
      remediation: CheckoutValidationRemediation
    }

export async function buildCheckoutHandoffContract(input: CheckoutHandoffInput) {
  const normalizedMessage = input.message.trim().toLowerCase()
  const digest = createHash("sha256").update(`${input.sessionId}:${normalizedMessage}`).digest("hex")
  const resolved = await resolveCheckoutHandoffContext({
    sessionId: input.sessionId,
    message: input.message,
    authSession: input.authSession,
    strictFinalization: true,
    allowNonProductionFallback: NON_PRODUCTION_CHECKOUT_FALLBACK,
    canonical: {
      ...(input.canonical ?? {}),
      merchantProfile: {
        merchantId: input.merchantId ?? input.canonical?.merchantProfile?.merchantId,
        merchantEntityId: input.merchantEntityId ?? input.canonical?.merchantProfile?.merchantEntityId,
        merchantCountry: input.merchantCountry ?? input.canonical?.merchantProfile?.merchantCountry,
      },
    },
  })

  return {
    merchant_id: resolved.merchantId,
    merchant_entity_id: resolved.merchantEntityId,
    merchant_country: resolved.merchantCountry,
    amount: resolved.amount,
    currency: resolved.currency,
    product_metadata: resolved.productMetadata,
    chat_context: {
      session_id: input.sessionId,
      user_intent: normalizedMessage,
      cart_id: input.canonical?.cartId ?? null,
      context_version: resolved.contextVersion,
    },
    payment_status: "payment_succeeded" as const,
    event_timestamp: new Date().toISOString(),
    accounting_context: {
      correlation_key: `corr:${digest}`,
      idempotency_key: resolved.idempotencyKey,
      jurisdiction: resolved.billingCountry,
      tax_breakdown: resolved.taxBreakdown,
      fee_breakdown: resolved.feeBreakdown,
      product_plan_metadata: {
        item_name: resolved.itemName,
        sku: resolved.sku,
        tags: ["via RunAshChat", "instant_checkout", "relay_handoff_v1"],
        plan: "runashchat_instant_checkout",
        context_version: resolved.contextVersion,
      },
      handoff_context_v2: {
        cart_id: input.canonical?.cartId ?? null,
        selected_sku: input.canonical?.selectedSku ?? resolved.sku,
        pricing_snapshot: input.canonical?.pricingSnapshot ?? null,
      },
    },
    idempotency_key: resolved.idempotencyKey,
  }
}

export async function evaluateCheckoutValidationGate(input: CheckoutHandoffInput): Promise<CheckoutGateEvaluation> {
  try {
    await buildCheckoutHandoffContract(input)
    return { canInitiateCheckout: true }
  } catch (error) {
    if (error instanceof CheckoutContextResolutionError) {
      return {
        canInitiateCheckout: false,
        remediation: error.remediation,
      }
    }

    throw error
  }
}

export function resolveRunAshChatToolSelection(message: string, requestedTools: RelayAgentTool[] = []): RelayAgentTool[] {
  if (requestedTools.length > 0) {
    return [...new Set(requestedTools)]
  }

  if (INSTANT_CHECKOUT_INTENT.test(message)) {
    return ["catalog_lookup", "initiate_link_checkout"]
  }

  if (SEARCH_INTENT.test(message)) {
    if (BUYER_PRODUCT_SEARCH_INTENT.test(message)) {
      return ["buyer_product_search", "catalog_lookup", "web_search"]
    }

    return ["catalog_lookup", "web_search"]
  }

  return ["catalog_lookup"]
}

export function buildToolPlan(tools: RelayAgentTool[]) {
  const immediate: RelayAgentTool[] = []
  const queued: RelayAgentTool[] = []

  for (const tool of tools) {
    if (relayToolExecutionMode[tool] === "immediate") {
      immediate.push(tool)
      continue
    }

    queued.push(tool)
  }

  return { immediate, queued }
}

export async function buildDefaultToolPayloads(input: {
  message: string
  sessionId: string
  canonical?: CheckoutCanonicalSessionInput
  authSession?: ServerAuthSession | null
  merchantId?: string
  merchantEntityId?: string
  merchantCountry?: string
  requestedTools?: RelayAgentTool[]
}) {
  const selectedTools = resolveRunAshChatToolSelection(input.message, input.requestedTools ?? [])
  if (!selectedTools.includes("initiate_link_checkout")) return undefined

  try {
    return {
      initiate_link_checkout: await buildCheckoutHandoffContract({
        message: input.message,
        sessionId: input.sessionId,
        canonical: input.canonical,
        authSession: input.authSession,
        merchantId: input.merchantId,
        merchantEntityId: input.merchantEntityId,
        merchantCountry: input.merchantCountry,
      }),
    }
  } catch (error) {
    if (error instanceof CheckoutContextResolutionError) {
      return {
        checkout_validation: {
          status: "blocked",
          ...error.remediation,
        },
      }
    }

    throw error
  }
}
