import assert from "node:assert/strict"
import test from "node:test"

import { createConnector, resetMcpStoreForTests } from "@/lib/mcp/connectors-store"
import { resolveRequestedToolsForMessage, routeToolsToMcp } from "@/lib/runash-chat/tooling"

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

test("falls back when MCP connector is unavailable", async () => {
  resetMcpStoreForTests()

  createConnector({
    serverName: "offline-mcp",
    endpoint: "http://127.0.0.1:1",
    transport: "http",
    enabledTools: ["catalog_lookup"],
    permissions: { allowAllUsers: true, allowedRoles: [], allowedUserIds: [] },
  })

  const summary = await routeToolsToMcp({ message: "find product" })
  assert.equal(summary.requestedTools.includes("catalog_lookup"), true)
  assert.equal(summary.fallbackTools.includes("catalog_lookup"), true)
})

test("denies MCP connector invocation for unauthorized actor", async () => {
  resetMcpStoreForTests()

  createConnector({
    serverName: "restricted-mcp",
    endpoint: "http://127.0.0.1:1",
    transport: "http",
    enabledTools: ["catalog_lookup"],
    permissions: { allowAllUsers: false, allowedRoles: ["admin"], allowedUserIds: [] },
  })

  const summary = await routeToolsToMcp({
    message: "find product",
    actor: { userId: "u_1", roles: ["viewer"] },
  })

  assert.equal(summary.fallbackTools.includes("catalog_lookup"), true)
  assert.equal(summary.mcpResults.some((result) => result.message === "Connector permission denied"), true)
})
