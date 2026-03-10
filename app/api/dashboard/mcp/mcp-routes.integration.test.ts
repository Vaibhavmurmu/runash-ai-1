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

function createFixtureAdapters() {
  const connectors: Array<{ tenantId: string; value: MpcConnectorConfig }> = []
  const audit: Array<{ tenantId: string; value: MpcToolAuditRecord }> = []

  return {
    async listConnectors(scope: { tenantId: string }) {
      return connectors.filter((entry) => entry.tenantId === scope.tenantId).map((entry) => ({ ...entry.value }))
    },
    async getConnectorById(id: string, scope: { tenantId: string }) {
      return connectors.find((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)?.value ?? null
    },
    async createConnector(input: any, scope: { tenantId: string }) {
      const now = new Date().toISOString()
      const connector: MpcConnectorConfig = {
        id: `connector-${connectors.length + 1}`,
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

      connectors.push({ tenantId: scope.tenantId, value: connector })
      return connector
    },
    async updateConnector(id: string, patch: any, scope: { tenantId: string }) {
      const match = connectors.find((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)
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
      const index = connectors.findIndex((entry) => entry.tenantId === scope.tenantId && entry.value.id === id)
      if (index < 0) return false
      connectors.splice(index, 1)
      return true
    },
    async createAuditRecord(record: Omit<MpcToolAuditRecord, "id" | "createdAt">, scope: { tenantId: string }) {
      const created: MpcToolAuditRecord = {
        ...record,
        id: `audit-${audit.length + 1}`,
        createdAt: new Date().toISOString(),
      }
      audit.unshift({ tenantId: scope.tenantId, value: created })
      return created
    },
    async listAuditRecords(limit: number, scope: { tenantId: string }) {
      return audit
        .filter((entry) => entry.tenantId === scope.tenantId)
        .slice(0, Math.max(1, Math.min(limit, 500)))
        .map((entry) => ({ ...entry.value }))
    },
  }
}

test("MCP dashboard routes enforce tenant + role scoping while preserving connector lifecycle and audit retrieval", async (t) => {
  let currentSession: SessionShape = { user: { id: "1", role: "admin", ssoOrganization: 101 } }

  t.mock.module("@/lib/auth/session", {
    namedExports: {
      getServerAuthSession: async () => currentSession,
    },
  })

  const connectorsRoute = await import("./connectors/route")
  const connectorByIdRoute = await import("./connectors/[id]/route")
  const auditRoute = await import("./audit/route")

  setMcpStoreAdaptersForTests(createFixtureAdapters())

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
    const patchResponse = await connectorByIdRoute.PATCH(
      new Request(`http://localhost/api/dashboard/mcp/connectors/${connectorId}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: { allowAllUsers: false, allowedRoles: ["admin"], allowedUserIds: [] } }),
      }),
      { params: Promise.resolve({ id: connectorId }) },
    )
    const patchPayload = await patchResponse.json()
    assert.equal(patchResponse.status, 200)
    assert.equal(patchPayload.connector.permissions.allowAllUsers, false)

    await invokeToolOnMcpConnector({
      toolName: "catalog_lookup",
      actor: { userId: "2", roles: ["user"] },
      scope: { tenantId: "org:101" },
    })

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
  } finally {
    setMcpStoreAdaptersForTests(null)
  }
})
