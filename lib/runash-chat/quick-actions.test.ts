import assert from "node:assert/strict"
import test from "node:test"

import { buildRunAshChatQuickActions } from "@/lib/runash-chat/quick-actions"

test("buildRunAshChatQuickActions returns expected core actions", () => {
  const prompts: string[] = []
  const quickActions = buildRunAshChatQuickActions({
    onPrompt: (prompt) => prompts.push(prompt),
    onSearch: (prompt) => prompts.push(prompt),
    openModelConfigurator: () => undefined,
  })

  assert.ok(quickActions.some((action) => action.id === "buyer-agent-search"))
  assert.ok(quickActions.some((action) => action.id === "instant-checkout"))
  assert.ok(quickActions.some((action) => action.id === "broker-agent-match"))

  const buyer = quickActions.find((action) => action.id === "buyer-agent-search")
  buyer?.action()
  assert.ok(prompts.some((prompt) => prompt.toLowerCase().includes("sustainable smartphone")))
})
