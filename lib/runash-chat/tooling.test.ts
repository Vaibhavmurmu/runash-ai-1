import assert from "node:assert/strict"
import test from "node:test"

import { resolveRequestedToolsForMessage } from "@/lib/runash-chat/tooling"

test("routes instant checkout intents to initiate_link_checkout", () => {
  const tools = resolveRequestedToolsForMessage("buy this now")
  assert.deepEqual(tools, ["catalog_lookup", "initiate_link_checkout"])
})

test("routes buyer discovery intents to buyer_product_search stack", () => {
  const tools = resolveRequestedToolsForMessage("find a sustainable smartphone under ₹10000")
  assert.deepEqual(tools, ["buyer_product_search", "catalog_lookup", "web_search"])
})

test("defaults to catalog lookup for generic prompts", () => {
  const tools = resolveRequestedToolsForMessage("hello there")
  assert.deepEqual(tools, ["catalog_lookup"])
})


test("routes seller optimization intents", () => {
  const tools = resolveRequestedToolsForMessage("optimize pricing and inventory bundles")
  assert.deepEqual(tools, ["seller_optimize_commerce", "inventory_health", "catalog_lookup"])
})

test("routes broker match intents", () => {
  const tools = resolveRequestedToolsForMessage("broker match supplier with retailer and settle deal")
  assert.deepEqual(tools, ["broker_match_deal", "create_initial_quote", "submit_counter_offer", "broker_settle_deal"])
})
