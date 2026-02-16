import { linkCheckoutSkill } from "@/lib/skills/link-checkout-skill"

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

export const relayAgentSkillModules = {
  [linkCheckoutSkill.name]: linkCheckoutSkill,
}
