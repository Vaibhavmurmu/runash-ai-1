export type MpcTransportType = "http" | "sse" | "stdio"

type AuthKind = "none" | "bearer" | "api_key" | "oauth"

export type ConnectorAuthMetadata = {
  type: AuthKind
  headerName?: string
  tokenRef?: string
}

export type ConnectorPermissionPolicy = {
  allowAllUsers: boolean
  allowedUserIds: string[]
  allowedRoles: string[]
}

export type MpcConnectorConfig = {
  id: string
  serverName: string
  endpoint: string
  transport: MpcTransportType
  auth: ConnectorAuthMetadata
  enabledTools: string[]
  enabled: boolean
  permissions: ConnectorPermissionPolicy
  createdAt: string
  updatedAt: string
}

export type MpcToolAuditRecord = {
  id: string
  connectorId: string
  connectorName: string
  toolName: string
  status: "allowed" | "denied" | "success" | "failed" | "fallback"
  actorUserId?: string | null
  actorRoles?: string[]
  detail?: string
  createdAt: string
  latencyMs?: number
}

type MpcStoreState = {
  connectors: MpcConnectorConfig[]
  audit: MpcToolAuditRecord[]
}

const globalScope = globalThis as typeof globalThis & { __runashMcpStore?: MpcStoreState }

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function nowIso() {
  return new Date().toISOString()
}

function getStore(): MpcStoreState {
  if (!globalScope.__runashMcpStore) {
    globalScope.__runashMcpStore = {
      connectors: [],
      audit: [],
    }
  }

  return globalScope.__runashMcpStore
}

export type CreateConnectorInput = {
  serverName: string
  endpoint: string
  transport: MpcTransportType
  auth?: Partial<ConnectorAuthMetadata>
  enabledTools?: string[]
  enabled?: boolean
  permissions?: Partial<ConnectorPermissionPolicy>
}

export function listConnectors() {
  return getStore().connectors.map((connector) => ({ ...connector }))
}

export function getConnectorById(id: string) {
  return getStore().connectors.find((connector) => connector.id === id) ?? null
}

export function createConnector(input: CreateConnectorInput) {
  const timestamp = nowIso()
  const connector: MpcConnectorConfig = {
    id: createId(),
    serverName: input.serverName.trim(),
    endpoint: input.endpoint.trim(),
    transport: input.transport,
    auth: {
      type: input.auth?.type ?? "none",
      headerName: input.auth?.headerName?.trim() || undefined,
      tokenRef: input.auth?.tokenRef?.trim() || undefined,
    },
    enabledTools: [...new Set((input.enabledTools ?? []).map((tool) => tool.trim()).filter(Boolean))],
    enabled: input.enabled ?? true,
    permissions: {
      allowAllUsers: input.permissions?.allowAllUsers ?? true,
      allowedRoles: [...new Set(input.permissions?.allowedRoles ?? [])],
      allowedUserIds: [...new Set(input.permissions?.allowedUserIds ?? [])],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  getStore().connectors.push(connector)
  return connector
}

export function updateConnector(id: string, patch: Partial<Omit<MpcConnectorConfig, "id" | "createdAt">>) {
  const connector = getConnectorById(id)
  if (!connector) return null

  if (patch.serverName !== undefined) connector.serverName = patch.serverName.trim()
  if (patch.endpoint !== undefined) connector.endpoint = patch.endpoint.trim()
  if (patch.transport !== undefined) connector.transport = patch.transport
  if (patch.enabled !== undefined) connector.enabled = patch.enabled
  if (patch.enabledTools !== undefined) {
    connector.enabledTools = [...new Set(patch.enabledTools.map((tool) => tool.trim()).filter(Boolean))]
  }
  if (patch.auth !== undefined) {
    connector.auth = {
      type: patch.auth.type ?? connector.auth.type,
      headerName: patch.auth.headerName?.trim() || undefined,
      tokenRef: patch.auth.tokenRef?.trim() || undefined,
    }
  }
  if (patch.permissions !== undefined) {
    connector.permissions = {
      allowAllUsers: patch.permissions.allowAllUsers ?? connector.permissions.allowAllUsers,
      allowedRoles: patch.permissions.allowedRoles ?? connector.permissions.allowedRoles,
      allowedUserIds: patch.permissions.allowedUserIds ?? connector.permissions.allowedUserIds,
    }
  }

  connector.updatedAt = nowIso()
  return { ...connector }
}

export function deleteConnector(id: string) {
  const store = getStore()
  const index = store.connectors.findIndex((connector) => connector.id === id)
  if (index < 0) return false
  store.connectors.splice(index, 1)
  return true
}

export function recordMcpAudit(record: Omit<MpcToolAuditRecord, "id" | "createdAt">) {
  const auditRecord: MpcToolAuditRecord = {
    ...record,
    id: createId(),
    createdAt: nowIso(),
  }
  getStore().audit.unshift(auditRecord)
  if (getStore().audit.length > 500) {
    getStore().audit.length = 500
  }
  return auditRecord
}

export function listMcpAudit(limit = 100) {
  return getStore().audit.slice(0, Math.max(1, Math.min(limit, 500)))
}

export function canInvokeConnector(connector: MpcConnectorConfig, actor: { userId?: string | null; roles?: string[] }) {
  if (!connector.enabled) return false
  if (connector.permissions.allowAllUsers) return true

  const roleSet = new Set(actor.roles ?? [])
  const hasRole = connector.permissions.allowedRoles.some((role) => roleSet.has(role))
  const hasUser = actor.userId ? connector.permissions.allowedUserIds.includes(actor.userId) : false

  return hasRole || hasUser
}

export function resetMcpStoreForTests() {
  globalScope.__runashMcpStore = {
    connectors: [],
    audit: [],
  }
}
