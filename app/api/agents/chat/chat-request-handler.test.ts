import assert from "node:assert/strict"
import test from "node:test"

import { buildToolPlan, resolveRunAshChatToolSelection } from "./chat-request-handler.ts"

test("tool plan splits immediate and queued tools", () => {
  const plan = buildToolPlan(["catalog_lookup", "inventory_health", "checkout_preview", "initiate_link_checkout"])

  assert.deepEqual(plan.immediate, ["catalog_lookup", "initiate_link_checkout"])
  assert.deepEqual(plan.queued, ["inventory_health", "checkout_preview"])
})


test("resolves instant checkout intents to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("buy this now")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("keeps explicit tool requests for backward compatibility", () => {
  const tools = resolveRunAshChatToolSelection("confirm", ["web_search"])
  assert.deepEqual(tools, ["web_search"])
})
