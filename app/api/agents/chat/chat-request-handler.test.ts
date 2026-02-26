import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCheckoutHandoffContract,
  buildToolPlan,
  resolveRunAshChatToolSelection,
} from "./chat-request-handler.ts"

test("tool plan splits immediate and queued tools", () => {
  const plan = buildToolPlan(["catalog_lookup", "inventory_health", "checkout_preview", "initiate_link_checkout"])

  assert.deepEqual(plan.immediate, ["catalog_lookup", "initiate_link_checkout"])
  assert.deepEqual(plan.queued, ["inventory_health", "checkout_preview"])
})


test("resolves 'buy this' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("buy this")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("resolves 'confirm purchase' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("confirm purchase")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("resolves 'pay now' instant checkout intent to initiate_link_checkout tool path", () => {
  const tools = resolveRunAshChatToolSelection("pay now")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("builds deterministic handoff contract with idempotency key per intent", () => {
  const first = buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-1",
    merchantId: "merchant-1",
  })
  const second = buildCheckoutHandoffContract({
    message: "buy this",
    sessionId: "session-1",
    merchantId: "merchant-1",
  })

  assert.equal(first.idempotency_key, second.idempotency_key)
  assert.equal(first.product_metadata.sku, second.product_metadata.sku)
  assert.equal(first.chat_context.session_id, "session-1")
  assert.equal(first.chat_context.user_intent, "buy this")
})

test("keeps explicit tool requests for backward compatibility", () => {
  const tools = resolveRunAshChatToolSelection("confirm", ["web_search"])
  assert.deepEqual(tools, ["web_search"])
})
