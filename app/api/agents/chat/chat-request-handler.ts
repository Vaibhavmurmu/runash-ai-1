import { relayToolExecutionMode, type RelayAgentTool } from "@/lib/skills/relay-tool-registry"
import { createHash } from "crypto"

const INSTANT_CHECKOUT_INTENT = /\b(buy this|confirm purchase|pay now|instant checkout|checkout|confirm)\b/i
const SEARCH_INTENT = /search|find|best|compare|web/i

type CheckoutHandoffInput = {
  message: string
  sessionId: string
  merchantId?: string
  merchantEntityId?: string
  merchantCountry?: string
}

function toCheckoutAmount(message: string) {
  const amountMatch = message.match(/(?:\$|usd\s*)(\d{1,6})/i)
  if (!amountMatch) return 1000
  const parsed = Number(amountMatch[1])
  if (!Number.isFinite(parsed) || parsed <= 0) return 1000
  return Math.round(parsed * 100)
}

export function buildCheckoutHandoffContract(input: CheckoutHandoffInput) {
  const normalizedMessage = input.message.trim().toLowerCase()
  const merchantId = input.merchantId?.trim() || "runash-default-merchant"
  const merchantEntityId = input.merchantEntityId?.trim() || `${merchantId}-entity`
  const merchantCountry = input.merchantCountry?.trim().toUpperCase() || "US"
  const digest = createHash("sha256").update(`${input.sessionId}:${normalizedMessage}`).digest("hex")
  const sku = `runashchat-${digest.slice(0, 12)}`
  const idempotencyKey = `intent:${digest}`

  return {
    merchant_id: merchantId,
    merchant_entity_id: merchantEntityId,
    merchant_country: merchantCountry,
    amount: toCheckoutAmount(input.message),
    currency: "USD" as const,
    product_metadata: {
      item_name: "RunAshChat Instant Checkout Item",
      sku,
      tags: ["via RunAshChat", "instant_checkout", "relay_handoff_v1"],
    },
    chat_context: {
      session_id: input.sessionId,
      user_intent: normalizedMessage,
    },
    payment_status: "payment_succeeded" as const,
    event_timestamp: new Date().toISOString(),
    accounting_context: {
      correlation_key: `corr:${digest}`,
      idempotency_key: idempotencyKey,
      jurisdiction: merchantCountry,
      tax_breakdown: {
        amount: 0,
        label: merchantCountry === "IN" ? "GST" : "Sales Tax",
      },
      fee_breakdown: {
        amount: 0,
        label: "payment_processing_fee",
      },
      product_plan_metadata: {
        item_name: "RunAshChat Instant Checkout Item",
        sku,
        tags: ["via RunAshChat", "instant_checkout", "relay_handoff_v1"],
        plan: "runashchat_instant_checkout",
      },
    },
    idempotency_key: idempotencyKey,
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

export function buildDefaultToolPayloads(input: {
  message: string
  sessionId: string
  merchantId?: string
  merchantEntityId?: string
  merchantCountry?: string
  requestedTools?: RelayAgentTool[]
}) {
  const selectedTools = resolveRunAshChatToolSelection(input.message, input.requestedTools ?? [])
  if (!selectedTools.includes("initiate_link_checkout")) return undefined

  return {
    initiate_link_checkout: buildCheckoutHandoffContract({
      message: input.message,
      sessionId: input.sessionId,
      merchantId: input.merchantId,
      merchantEntityId: input.merchantEntityId,
      merchantCountry: input.merchantCountry,
    }),
  }
}
