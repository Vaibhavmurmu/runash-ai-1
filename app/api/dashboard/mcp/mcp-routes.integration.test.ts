import assert from "node:assert/strict"
import test from "node:test"

import { invokeToolOnMcpConnector } from "@/lib/mcp/runtime"
import { setMcpStoreAdaptersForTests, type MpcConnectorConfig, type MpcToolAuditRecord } from "@/lib/mcp/connectors-store"

type SessionShape = {
  user?: {
    id?: string
    role?: string
    ssoOrganization?: number
  }
} | null

type PersistentState = {
  connectors: Array<{ tenantId: string; value: MpcConnectorConfig }>
  audit: Array<{ tenantId: string; value: MpcToolAuditRecord }>
}

function createFixtureAdapters(state: PersistentState) {
  return {
    async listConnectors(scope: { tenantId: string }) {
      return state.connectors.filter((entry) => entry.tenantId === scope.tenantId).map((entry) => ({ ...entry.value }))
    },
    async getConnectorById(id: string, scope: { tenantId: string }) {
      return state.connectors.find((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)?.value ?? null
    },
    async createConnector(input: any, scope: { tenantId: string }) {
      const now = new Date().toISOString()
      const connector: MpcConnectorConfig = {
        id: `connector-${state.connectors.length + 1}`,
        serverName: input.serverName,
        endpoint: input.endpoint,
        transport: input.transport,
        auth: {
          type: input.auth?.type ?? "none",
          headerName: input.auth?.headerName,
          tokenRef: input.auth?.tokenRef,
        },
        enabledTools: input.enabledTools ?? [],
        enabled: input.enabled ?? true,
        permissions: {
          allowAllUsers: input.permissions?.allowAllUsers ?? true,
          allowedUserIds: input.permissions?.allowedUserIds ?? [],
          allowedRoles: input.permissions?.allowedRoles ?? [],
        },
        createdAt: now,
        updatedAt: now,
      }

      state.connectors.push({ tenantId: scope.tenantId, value: connector })
      return connector
    },
    async updateConnector(id: string, patch: any, scope: { tenantId: string }) {
      const match = state.connectors.find((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)
      if (!match) return null

      match.value = {
        ...match.value,
        ...patch,
        auth: patch.auth ? { ...match.value.auth, ...patch.auth } : match.value.auth,
        permissions: patch.permissions ? { ...match.value.permissions, ...patch.permissions } : match.value.permissions,
        updatedAt: new Date().toISOString(),
      }

      return { ...match.value }
    },
    async deleteConnector(id: string, scope: { tenantId: string }) {
      const index = state.connectors.findIndex((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)
      if (index < 0) return false
      state.connectors.splice(index, 1)
      return true
    },
    async createAuditRecord(record: Omit<MpcToolAuditRecord, "id" | "createdAt">, scope: { tenantId: string }) {
      const created: MpcToolAuditRecord = {
        ...record,
        id: `audit-${state.audit.length + 1}`,
        createdAt: new Date().toISOString(),
      }
      state.audit.unshift({ tenantId: scope.tenantId, value: created })
      return created
    },
    async listAuditRecords(limit: number, scope: { tenantId: string }) {
      return state.audit
        .filter((entry) => entry.tenantId === scope.tenantId)
        .slice(0, Math.max(1, Math.min(limit, 500)))
        .map((entry) => ({ ...entry.value }))
    },
  }
}

test("MCP dashboard routes enforce tenant scoping, mutating permissions, lifecycle, and restart-safe audit retrieval", async (t) => {
  let currentSession: SessionShape = { user: { id: "1", role: "admin", ssoOrganization: 101 } }

  t.mock.module("@/lib/auth/session", {
    namedExports: {
      getServerAuthSession: async () => currentSession,
    },
  })

  const connectorsRoute = await import("./connectors/route")
  const connectorByIdRoute = await import("./connectors/[id]/route")
  const auditRoute = await import("./audit/route")

  const state: PersistentState = { connectors: [], audit: [] }
  setMcpStoreAdaptersForTests(createFixtureAdapters(state))

  try {
    const createResponse = await connectorsRoute.POST(
      new Request("http://localhost/api/dashboard/mcp/connectors", {
        method: "POST",
        body: JSON.stringify({
          serverName: "catalog-mcp",
          endpoint: "http://127.0.0.1:1",
          transport: "http",
          enabledTools: ["catalog_lookup"],
          permissions: { allowAllUsers: true, allowedRoles: [], allowedUserIds: [] },
        }),
      }),
    )
    assert.equal(createResponse.status, 201)
    const createdPayload = await createResponse.json()
    const connectorId = createdPayload.connector.id as string

    const listResponse = await connectorsRoute.GET(new Request("http://localhost/api/dashboard/mcp/connectors"))
    const listPayload = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(listPayload.connectors.length, 1)

    currentSession = { user: { id: "2", role: "user", ssoOrganization: 101 } }
    const forbiddenWrite = await connectorByIdRoute.PATCH(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    assert.equal(forbiddenWrite.status, 403)

    currentSession = { user: { id: "1", role: "admin", ssoOrganization: 101 } }
    const updateResponse = await connectorByIdRoute.PATCH(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "PATCH",
        body: JSON.stringify({ serverName: "catalog-mcp-v2" }),
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    assert.equal(updateResponse.status, 200)

    const disableResponse = await connectorByIdRoute.PATCH(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    assert.equal(disableResponse.status, 200)

    const enableResponse = await connectorByIdRoute.PATCH(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true, permissions: { allowAllUsers: false, allowedRoles: ["admin"], allowedUserIds: [] } }),
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    assert.equal(enableResponse.status, 200)

    await invokeToolOnMcpConnector({
      toolName: "catalog_lookup",
      actor: { userId: "2", roles: ["user"] },
      scope: { tenantId: "org:101" },
    })

    setMcpStoreAdaptersForTests(null)
    setMcpStoreAdaptersForTests(createFixtureAdapters(state))

    currentSession = { user: { id: "2", role: "user", ssoOrganization: 999 } }
    const crossTenantList = await connectorsRoute.GET(new Request("http://localhost/api/dashboard/mcp/connectors"))
    const crossTenantPayload = await crossTenantList.json()
    assert.equal(crossTenantList.status, 200)
    assert.equal(crossTenantPayload.connectors.length, 0)

    currentSession = { user: { id: "1", role: "admin", ssoOrganization: 101 } }
    const auditResponse = await auditRoute.GET(new Request("http://localhost/api/dashboard/mcp/audit?limit=5"))
    const auditPayload = await auditResponse.json()
    assert.equal(auditResponse.status, 200)
    assert.equal(auditPayload.audit.length, 1)
    assert.equal(auditPayload.audit[0].status, "denied")

    const deleteResponse = await connectorByIdRoute.DELETE(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    assert.equal(deleteResponse.status, 200)

    const postDeleteList = await connectorsRoute.GET(new Request("http://localhost/api/dashboard/mcp/connectors"))
    const postDeletePayload = await postDeleteList.json()
    assert.equal(postDeletePayload.connectors.length, 0)
  } finally {
    setMcpStoreAdaptersForTests(null)
  }
})
