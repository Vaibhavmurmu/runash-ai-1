import { relayToolExecutionMode, type RelayAgentTool } from "@/lib/skills/relay-tool-registry"

const INSTANT_CHECKOUT_INTENT = /\b(buy this|confirm purchase|pay now|instant checkout|checkout|confirm)\b/i
const SEARCH_INTENT = /search|find|best|compare|web/i

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
