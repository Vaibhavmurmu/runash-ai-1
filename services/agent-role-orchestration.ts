import type { RelayAgentTool } from "@/lib/skills/relay-tool-registry"

export const AGENT_ROLES = ["buyer", "seller", "broker"] as const

export type AgentRole = (typeof AGENT_ROLES)[number]

export type RoleObjectiveWeights = {
  price: number
  sustainability: number
  inventoryUrgency: number
  margin: number
}

export type RoleGuardrails = {
  maxDiscountPercent: number
  approvalThresholdMinor: number
  negotiationLimitPercent: number
}

export type RolePreferences = {
  prioritizeSustainability?: boolean
  maxBudgetMinor?: number
  minMarginPercent?: number
  urgencyLevel?: "low" | "medium" | "high"
}

export type RolePolicy = {
  role: AgentRole
  allowedTools: readonly RelayAgentTool[]
  objectiveWeights: RoleObjectiveWeights
  guardrails: RoleGuardrails
}

const ALL_TOOLS: readonly RelayAgentTool[] = [
  "catalog_lookup",
  "inventory_health",
  "checkout_preview",
  "web_search",
  "initiate_link_checkout",
]

export const AGENT_ROLE_POLICY_MAP: Record<AgentRole, RolePolicy> = {
  buyer: {
    role: "buyer",
    allowedTools: ["catalog_lookup", "inventory_health", "checkout_preview", "web_search", "initiate_link_checkout"],
    objectiveWeights: {
      price: 0.5,
      sustainability: 0.2,
      inventoryUrgency: 0.2,
      margin: 0.1,
    },
    guardrails: {
      maxDiscountPercent: 18,
      approvalThresholdMinor: 250_000,
      negotiationLimitPercent: 15,
    },
  },
  seller: {
    role: "seller",
    allowedTools: ["catalog_lookup", "inventory_health", "checkout_preview", "web_search"],
    objectiveWeights: {
      price: 0.2,
      sustainability: 0.1,
      inventoryUrgency: 0.2,
      margin: 0.5,
    },
    guardrails: {
      maxDiscountPercent: 10,
      approvalThresholdMinor: 500_000,
      negotiationLimitPercent: 8,
    },
  },
  broker: {
    role: "broker",
    allowedTools: ALL_TOOLS,
    objectiveWeights: {
      price: 0.3,
      sustainability: 0.2,
      inventoryUrgency: 0.2,
      margin: 0.3,
    },
    guardrails: {
      maxDiscountPercent: 14,
      approvalThresholdMinor: 400_000,
      negotiationLimitPercent: 12,
    },
  },
}

export function resolveRolePolicy(role?: AgentRole | null): RolePolicy {
  if (!role) return AGENT_ROLE_POLICY_MAP.broker
  return AGENT_ROLE_POLICY_MAP[role] ?? AGENT_ROLE_POLICY_MAP.broker
}

export function isToolAllowedForRole(role: AgentRole | null | undefined, tool: RelayAgentTool): boolean {
  return resolveRolePolicy(role).allowedTools.includes(tool)
}

export function clampRolePreferences(input?: RolePreferences | null): RolePreferences {
  if (!input) return {}

  const cappedBudget =
    typeof input.maxBudgetMinor === "number" && Number.isFinite(input.maxBudgetMinor)
      ? Math.max(0, Math.round(input.maxBudgetMinor))
      : undefined

  const cappedMargin =
    typeof input.minMarginPercent === "number" && Number.isFinite(input.minMarginPercent)
      ? Math.min(100, Math.max(0, input.minMarginPercent))
      : undefined

  return {
    prioritizeSustainability: Boolean(input.prioritizeSustainability),
    maxBudgetMinor: cappedBudget,
    minMarginPercent: cappedMargin,
    urgencyLevel: input.urgencyLevel,
  }
}
