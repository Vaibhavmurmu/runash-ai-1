import { initiateLinkCheckoutTool } from "@/lib/agent-tools/initiate-link-checkout"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { type AgentRole, isToolAllowedForRole, resolveRolePolicy } from "@/services/agent-role-orchestration"
import {
  brokerDealMatchAdapter,
  buyerProductSearchAdapter,
  getCheckoutPreviewAdapter,
  getInventoryHealthAdapter,
  queryCatalogAdapter,
  sellerOptimizationAdapter,
} from "@/services/relay-commerce-adapters"
import { searchProductsWithProviders } from "@/services/web-search-service"
import { brokerMediatedSettlement, counterOffer, createInitialQuote } from "@/services/deal-negotiation-service"

export const RELAY_AGENT_TOOLS = [
  "catalog_lookup",
  "inventory_health",
  "checkout_preview",
  "web_search",
  "buyer_product_search",
  "seller_optimize_commerce",
  "broker_match_deal",
  "initiate_link_checkout",
  "create_initial_quote",
  "submit_counter_offer",
  "broker_settle_deal",
] as const

export type RelayAgentTool = (typeof RELAY_AGENT_TOOLS)[number]

export type RoleTaggedActivitySummary = {
  role: AgentRole
  tool: RelayAgentTool
  objectiveWeights: Record<string, number>
  guardrails: Record<string, number>
  allowedByRolePolicy: boolean
  status: "allowed" | "blocked"
  message: string
}

export const relayToolExecutionMode: Record<RelayAgentTool, "immediate" | "queued"> = {
  catalog_lookup: "immediate",
  inventory_health: "queued",
  checkout_preview: "queued",
  web_search: "immediate",
  buyer_product_search: "immediate",
  seller_optimize_commerce: "queued",
  broker_match_deal: "queued",
  initiate_link_checkout: "immediate",
  create_initial_quote: "queued",
  submit_counter_offer: "queued",
  broker_settle_deal: "queued",
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
  web_search: {
    name: "web_search",
    execute: async (args: unknown) => {
      const payload = (args ?? {}) as Record<string, unknown>
      const query = typeof payload.query === "string" ? payload.query : ""
      return searchProductsWithProviders(query)
    },
  },
  buyer_product_search: {
    name: "buyer_product_search",
    execute: buyerProductSearchAdapter,
  },

  seller_optimize_commerce: {
    name: "seller_optimize_commerce",
    execute: sellerOptimizationAdapter,
  },
  broker_match_deal: {
    name: "broker_match_deal",
    execute: brokerDealMatchAdapter,
  },

  create_initial_quote: {
    name: "create_initial_quote",
    execute: createInitialQuote,
  },
  submit_counter_offer: {
    name: "submit_counter_offer",
    execute: counterOffer,
  },
  broker_settle_deal: {
    name: "broker_settle_deal",
    execute: brokerMediatedSettlement,
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

export function createRoleTaggedActivitySummary(role: AgentRole, tool: RelayAgentTool, allowedByRolePolicy: boolean): RoleTaggedActivitySummary {
  const policy = resolveRolePolicy(role)
  return {
    role,
    tool,
    objectiveWeights: policy.objectiveWeights,
    guardrails: policy.guardrails,
    allowedByRolePolicy,
    status: allowedByRolePolicy ? "allowed" : "blocked",
    message: allowedByRolePolicy
      ? `${role} role allowed to invoke ${tool}`
      : `${role} role is blocked from invoking ${tool}`,
  }
}

export async function executeRoleConditionedTool(input: {
  role: AgentRole
  tool: RelayAgentTool
  args: unknown
}): Promise<{ result: Record<string, unknown>; activitySummary: RoleTaggedActivitySummary }> {
  const allowed = isToolAllowedForRole(input.role, input.tool)
  const activitySummary = createRoleTaggedActivitySummary(input.role, input.tool, allowed)

  if (!allowed) {
    return {
      result: {
        status: "blocked_by_role_policy",
        blocked_reason: "tool_not_allowed_for_role",
        tool: input.tool,
        role: input.role,
      },
      activitySummary,
    }
  }

  const module = relayAgentSkillModules[input.tool]
  const executionResult = (await module.execute(input.args)) as Record<string, unknown>
  return {
    result: executionResult,
    activitySummary,
  }
}
