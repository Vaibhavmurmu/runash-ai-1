import { initiateLinkCheckoutTool } from "@/lib/agent-tools/initiate-link-checkout"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { type AgentRole, isToolAllowedForRole, resolveRolePolicy } from "@/services/agent-role-orchestration"
import {
  getCheckoutPreviewAdapter,
  getInventoryHealthAdapter,
  queryCatalogAdapter,
} from "@/services/relay-commerce-adapters"
import { searchProductsWithProviders } from "@/services/web-search-service"

export const RELAY_AGENT_TOOLS = [
  "catalog_lookup",
  "inventory_health",
  "checkout_preview",
  "web_search",
  "initiate_link_checkout",
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
  web_search: {
    name: "web_search",
    execute: async (args: unknown) => {
      const payload = (args ?? {}) as Record<string, unknown>
      const query = typeof payload.query === "string" ? payload.query : ""
      return searchProductsWithProviders(query)
    },
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
