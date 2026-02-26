import { initiateLinkCheckoutTool } from "@/lib/agent-tools/initiate-link-checkout"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import {
  getCheckoutPreviewAdapter,
  getInventoryHealthAdapter,
  queryCatalogAdapter,
} from "@/services/relay-commerce-adapters"

export const RELAY_AGENT_TOOLS = [
  "catalog_lookup",
  "inventory_health",
  "checkout_preview",
  "web_search",
  "initiate_link_checkout",
] as const

export type RelayAgentTool = (typeof RELAY_AGENT_TOOLS)[number]

export const relayToolExecutionMode: Record<RelayAgentTool, "immediate" | "queued"> = {
  catalog_lookup: "immediate",
  inventory_health: "queued",
  checkout_preview: "queued",
  web_search: "immediate",
  initiate_link_checkout: "immediate",
}

export const relayAgentSkillModules: Record<string, { name: string; execute: (args: unknown) => Promise<unknown> }> = {
  catalog_lookup: {
    name: "catalog_lookup",
    execute: queryCatalogAdapter,
  },
  inventory_health: {
    name: "inventory_health",
    execute: getInventoryHealthAdapter,
  },
  checkout_preview: {
    name: "checkout_preview",
    execute: getCheckoutPreviewAdapter,
  },
  [initiateLinkCheckoutTool.name]: {
    ...initiateLinkCheckoutTool,
    execute: async (args: unknown) => {
      const payload = (args ?? {}) as Record<string, unknown>
      const amountMinor = typeof payload.amount === "number" && Number.isFinite(payload.amount) ? Math.round(payload.amount) : 0
      const currency = typeof payload.currency === "string" ? payload.currency : "USD"
      const humanConfirmed =
        typeof payload.human_confirmed === "boolean"
          ? payload.human_confirmed
          : typeof payload.user_confirmation_after_preview === "boolean"
            ? payload.user_confirmation_after_preview
            : false
      const mfaVerified = typeof payload.mfa_verified === "boolean" ? payload.mfa_verified : false

      const validatorGate = enforcePaymentValidatorMiddleware({
        amountMinor,
        currency,
        humanConfirmed,
        mfaVerified,
      })

      if (!validatorGate.allowed) {
        return {
          status: "validation_failed",
          checkout_session_id: null,
          request_id: "validator_gate_blocked",
          next_action: "collect_valid_checkout_fields",
          blocked_reason: "validator_gate_blocked",
          validatorGate,
          activity_summary_payload: {
            checkoutId: null,
            status: "validation_failed",
            nextAction: "collect_valid_checkout_fields",
            requestId: "validator_gate_blocked",
          },
        }
      }

      return initiateLinkCheckoutTool.execute(args)
    },
  },
}
