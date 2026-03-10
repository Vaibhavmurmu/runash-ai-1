import assert from "node:assert/strict"
import test from "node:test"

import { createConnector, setMcpStoreAdaptersForTests } from "@/lib/mcp/connectors-store"
import { resolveRequestedToolsForMessage, routeToolsToMcp } from "@/lib/runash-chat/tooling"

function installMcpFixture() {
  const state = {
    connectors: [] as any[],
    audit: [] as any[],
  }

  setMcpStoreAdaptersForTests({
    async listConnectors(scope) {
      return state.connectors.filter((connector) => connector.tenantId === scope.tenantId).map((connector) => ({ ...connector.value }))
    },
    async getConnectorById(id, scope) {
      return state.connectors.find((connector) => connector.id === id && connector.tenantId === scope.tenantId)?.value ?? null
    },
    async createConnector(input, scope) {
      const now = new Date().toISOString()
      const value = {
        id: `fixture-${state.connectors.length + 1}`,
        serverName: input.serverName,
        endpoint: input.endpoint,
        transport: input.transport,
        auth: { type: input.auth?.type ?? "none", headerName: input.auth?.headerName, tokenRef: input.auth?.tokenRef },
        enabledTools: input.enabledTools ?? [],
        enabled: input.enabled ?? true,
        permissions: {
          allowAllUsers: input.permissions?.allowAllUsers ?? true,
          allowedRoles: input.permissions?.allowedRoles ?? [],
          allowedUserIds: input.permissions?.allowedUserIds ?? [],
        },
        createdAt: now,
        updatedAt: now,
      }

      state.connectors.push({ id: value.id, tenantId: scope.tenantId, value })
      return value
    },
    async updateConnector() {
      return null
    },
    async deleteConnector() {
      return false
    },
    async createAuditRecord(record, scope) {
      const created = { ...record, id: `audit-${state.audit.length + 1}`, createdAt: new Date().toISOString() }
      state.audit.unshift({ tenantId: scope.tenantId, value: created })
      return created
    },
    async listAuditRecords(limit, scope) {
      return state.audit.filter((item) => item.tenantId === scope.tenantId).slice(0, limit).map((item) => item.value)
    },
  })
}

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
  installMcpFixture()

  await createConnector({
    serverName: "offline-mcp",
    endpoint: "http://127.0.0.1:1",
    transport: "http",
    enabledTools: ["catalog_lookup"],
    permissions: { allowAllUsers: true, allowedRoles: [], allowedUserIds: [] },
  })

  const summary = await routeToolsToMcp({ message: "find product" })
  assert.equal(summary.requestedTools.includes("catalog_lookup"), true)
  assert.equal(summary.fallbackTools.includes("catalog_lookup"), true)

  setMcpStoreAdaptersForTests(null)
})

test("denies MCP connector invocation for unauthorized actor", async () => {
  installMcpFixture()

  await createConnector({
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

  setMcpStoreAdaptersForTests(null)
})
