import { relayToolExecutionMode, type RelayAgentTool } from "@/lib/skills/relay-tool-registry"

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
