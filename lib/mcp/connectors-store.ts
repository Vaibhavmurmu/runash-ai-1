import {
  createMcpAuditRecord,
  createMcpConnector,
  deleteMcpConnector,
  getMcpConnectorById,
  listMcpAuditRecords,
  listMcpConnectorsByTenant,
  setMcpRepositoryAdaptersForTests,
  updateMcpConnector,
  type McpConnectorScope,
} from "@/lib/repositories/mcp-connectors"

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

export type CreateConnectorInput = {
  serverName: string
  endpoint: string
  transport: MpcTransportType
  auth?: Partial<ConnectorAuthMetadata>
  enabledTools?: string[]
  enabled?: boolean
  permissions?: Partial<ConnectorPermissionPolicy>
}

export type McpStoreScope = {
  tenantId?: string
}

const DEFAULT_SCOPE: McpConnectorScope = {
  tenantId: "global",
}

function toRepositoryScope(scope?: McpStoreScope): McpConnectorScope {
  return {
    tenantId: scope?.tenantId?.trim() || DEFAULT_SCOPE.tenantId,
  }
}

export async function listConnectors(scope?: McpStoreScope) {
  return listMcpConnectorsByTenant(toRepositoryScope(scope))
}

export async function getConnectorById(id: string, scope?: McpStoreScope) {
  return getMcpConnectorById(id, toRepositoryScope(scope))
}

export async function createConnector(input: CreateConnectorInput, scope?: McpStoreScope) {
  return createMcpConnector(input, toRepositoryScope(scope))
}

export async function updateConnector(id: string, patch: Partial<Omit<MpcConnectorConfig, "id" | "createdAt">>, scope?: McpStoreScope) {
  return updateMcpConnector(id, patch, toRepositoryScope(scope))
}

export async function deleteConnector(id: string, scope?: McpStoreScope) {
  return deleteMcpConnector(id, toRepositoryScope(scope))
}

export async function recordMcpAudit(record: Omit<MpcToolAuditRecord, "id" | "createdAt">, scope?: McpStoreScope) {
  return createMcpAuditRecord(record, toRepositoryScope(scope))
}

export async function listMcpAudit(limit = 100, scope?: McpStoreScope) {
  return listMcpAuditRecords(limit, toRepositoryScope(scope))
}

export function canInvokeConnector(connector: MpcConnectorConfig, actor: { userId?: string | null; roles?: string[] }) {
  if (!connector.enabled) return false
  if (connector.permissions.allowAllUsers) return true

  const roleSet = new Set(actor.roles ?? [])
  const hasRole = connector.permissions.allowedRoles.some((role) => roleSet.has(role))
  const hasUser = actor.userId ? connector.permissions.allowedUserIds.includes(actor.userId) : false

  return hasRole || hasUser
}

export function setMcpStoreAdaptersForTests(adapters: Parameters<typeof setMcpRepositoryAdaptersForTests>[0]) {
  setMcpRepositoryAdaptersForTests(adapters)
}
