import { queryMany, queryOne } from "@/lib/db"
import type { CreateConnectorInput, MpcConnectorConfig, MpcToolAuditRecord } from "@/lib/mcp/connectors-store"

export type McpConnectorScope = {
  tenantId: string
}

type McpConnectorRow = {
  id: string
  tenant_id: string
  server_name: string
  endpoint: string
  transport: "http" | "sse" | "stdio"
  auth_type: "none" | "bearer" | "api_key" | "oauth"
  auth_header_name: string | null
  auth_token_ref: string | null
  enabled_tools: unknown
  enabled: boolean
  permission_allow_all_users: boolean
  permission_allowed_user_ids: unknown
  permission_allowed_roles: unknown
  created_at: string
  updated_at: string
}

type McpAuditRow = {
  id: string
  tenant_id: string
  connector_id: string
  connector_name: string
  tool_name: string
  status: "allowed" | "denied" | "success" | "failed" | "fallback"
  actor_user_id: string | null
  actor_roles: unknown
  detail: string | null
  latency_ms: number | null
  created_at: string
}

type McpRepositoryAdapters = {
  listConnectors: (scope: McpConnectorScope) => Promise<McpConnectorConfig[]>
  getConnectorById: (id: string, scope: McpConnectorScope) => Promise<MpcConnectorConfig | null>
  createConnector: (input: CreateConnectorInput, scope: McpConnectorScope) => Promise<MpcConnectorConfig>
  updateConnector: (id: string, patch: Partial<Omit<MpcConnectorConfig, "id" | "createdAt">>, scope: McpConnectorScope) => Promise<MpcConnectorConfig | null>
  deleteConnector: (id: string, scope: McpConnectorScope) => Promise<boolean>
  createAuditRecord: (record: Omit<MpcToolAuditRecord, "id" | "createdAt">, scope: McpConnectorScope) => Promise<MpcToolAuditRecord>
  listAuditRecords: (limit: number, scope: McpConnectorScope) => Promise<MpcToolAuditRecord[]>
}

const MCP_AUDIT_RETENTION_MAX_RECORDS_PER_TENANT = 2000

function jsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function mapConnector(row: McpConnectorRow): MpcConnectorConfig {
  return {
    id: row.id,
    serverName: row.server_name,
    endpoint: row.endpoint,
    transport: row.transport,
    auth: {
      type: row.auth_type,
      headerName: row.auth_header_name ?? undefined,
      tokenRef: row.auth_token_ref ?? undefined,
    },
    enabledTools: jsonArray(row.enabled_tools),
    enabled: row.enabled,
    permissions: {
      allowAllUsers: row.permission_allow_all_users,
      allowedUserIds: jsonArray(row.permission_allowed_user_ids),
      allowedRoles: jsonArray(row.permission_allowed_roles),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAuditRecord(row: McpAuditRow): MpcToolAuditRecord {
  return {
    id: row.id,
    connectorId: row.connector_id,
    connectorName: row.connector_name,
    toolName: row.tool_name,
    status: row.status,
    actorUserId: row.actor_user_id,
    actorRoles: jsonArray(row.actor_roles),
    detail: row.detail ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    createdAt: row.created_at,
  }
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeCreateInput(input: CreateConnectorInput): CreateConnectorInput {
  return {
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
  }
}

const defaultRepositoryAdapters: McpRepositoryAdapters = {
  async listConnectors(scope) {
    const rows = await queryMany<McpConnectorRow>(
      `
        SELECT
          id,
          tenant_id,
          server_name,
          endpoint,
          transport,
          auth_type,
          auth_header_name,
          auth_token_ref,
          enabled_tools,
          enabled,
          permission_allow_all_users,
          permission_allowed_user_ids,
          permission_allowed_roles,
          created_at,
          updated_at
        FROM mcp_connectors
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `,
      [scope.tenantId],
    )

    return rows.map(mapConnector)
  },
  async getConnectorById(id, scope) {
    const row = await queryOne<McpConnectorRow>(
      `
      SELECT
        id,
        tenant_id,
        server_name,
        endpoint,
        transport,
        auth_type,
        auth_header_name,
        auth_token_ref,
        enabled_tools,
        enabled,
        permission_allow_all_users,
        permission_allowed_user_ids,
        permission_allowed_roles,
        created_at,
        updated_at
      FROM mcp_connectors
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `,
      [id, scope.tenantId],
    )

    return row ? mapConnector(row) : null
  },
  async createConnector(input, scope) {
    const normalized = normalizeCreateInput(input)
    const row = await queryOne<McpConnectorRow>(
      `
      INSERT INTO mcp_connectors (
        id,
        tenant_id,
        server_name,
        endpoint,
        transport,
        auth_type,
        auth_header_name,
        auth_token_ref,
        enabled_tools,
        enabled,
        permission_allow_all_users,
        permission_allowed_user_ids,
        permission_allowed_roles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb)
      RETURNING
        id,
        tenant_id,
        server_name,
        endpoint,
        transport,
        auth_type,
        auth_header_name,
        auth_token_ref,
        enabled_tools,
        enabled,
        permission_allow_all_users,
        permission_allowed_user_ids,
        permission_allowed_roles,
        created_at,
        updated_at
    `,
      [
        createId(),
        scope.tenantId,
        normalized.serverName,
        normalized.endpoint,
        normalized.transport,
        normalized.auth?.type ?? "none",
        normalized.auth?.headerName ?? null,
        normalized.auth?.tokenRef ?? null,
        JSON.stringify(normalized.enabledTools ?? []),
        normalized.enabled ?? true,
        normalized.permissions?.allowAllUsers ?? true,
        JSON.stringify(normalized.permissions?.allowedUserIds ?? []),
        JSON.stringify(normalized.permissions?.allowedRoles ?? []),
      ],
    )

    if (!row) {
      throw new Error("Failed to create MCP connector")
    }

    return mapConnector(row)
  },
  async updateConnector(id, patch, scope) {
    const current = await this.getConnectorById(id, scope)
    if (!current) return null

    const next = {
      serverName: patch.serverName !== undefined ? patch.serverName.trim() : current.serverName,
      endpoint: patch.endpoint !== undefined ? patch.endpoint.trim() : current.endpoint,
      transport: patch.transport ?? current.transport,
      enabled: patch.enabled ?? current.enabled,
      auth: {
        type: patch.auth?.type ?? current.auth.type,
        headerName: patch.auth?.headerName?.trim() || current.auth.headerName,
        tokenRef: patch.auth?.tokenRef?.trim() || current.auth.tokenRef,
      },
      enabledTools:
        patch.enabledTools !== undefined
          ? [...new Set(patch.enabledTools.map((tool) => tool.trim()).filter(Boolean))]
          : current.enabledTools,
      permissions: {
        allowAllUsers: patch.permissions?.allowAllUsers ?? current.permissions.allowAllUsers,
        allowedUserIds: patch.permissions?.allowedUserIds ?? current.permissions.allowedUserIds,
        allowedRoles: patch.permissions?.allowedRoles ?? current.permissions.allowedRoles,
      },
    }

    const row = await queryOne<McpConnectorRow>(
      `
      UPDATE mcp_connectors
      SET
        server_name = $1,
        endpoint = $2,
        transport = $3,
        auth_type = $4,
        auth_header_name = $5,
        auth_token_ref = $6,
        enabled_tools = $7::jsonb,
        enabled = $8,
        permission_allow_all_users = $9,
        permission_allowed_user_ids = $10::jsonb,
        permission_allowed_roles = $11::jsonb,
        updated_at = now()
      WHERE id = $12 AND tenant_id = $13
      RETURNING
        id,
        tenant_id,
        server_name,
        endpoint,
        transport,
        auth_type,
        auth_header_name,
        auth_token_ref,
        enabled_tools,
        enabled,
        permission_allow_all_users,
        permission_allowed_user_ids,
        permission_allowed_roles,
        created_at,
        updated_at
    `,
      [
        next.serverName,
        next.endpoint,
        next.transport,
        next.auth.type,
        next.auth.headerName ?? null,
        next.auth.tokenRef ?? null,
        JSON.stringify(next.enabledTools),
        next.enabled,
        next.permissions.allowAllUsers,
        JSON.stringify(next.permissions.allowedUserIds),
        JSON.stringify(next.permissions.allowedRoles),
        id,
        scope.tenantId,
      ],
    )

    return row ? mapConnector(row) : null
  },
  async deleteConnector(id, scope) {
    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM mcp_connectors WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, scope.tenantId],
    )

    return Boolean(deleted)
  },
  async createAuditRecord(record, scope) {
    const row = await queryOne<McpAuditRow>(
      `
      INSERT INTO mcp_tool_audit_records (
        id,
        tenant_id,
        connector_id,
        connector_name,
        tool_name,
        status,
        actor_user_id,
        actor_roles,
        detail,
        latency_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
      RETURNING
        id,
        tenant_id,
        connector_id,
        connector_name,
        tool_name,
        status,
        actor_user_id,
        actor_roles,
        detail,
        latency_ms,
        created_at
    `,
      [
        createId(),
        scope.tenantId,
        record.connectorId,
        record.connectorName,
        record.toolName,
        record.status,
        record.actorUserId ?? null,
        JSON.stringify(record.actorRoles ?? []),
        record.detail ?? null,
        record.latencyMs ?? null,
      ],
    )

    if (!row) {
      throw new Error("Failed to create MCP tool audit record")
    }

    await queryMany(
      `
      DELETE FROM mcp_tool_audit_records
      WHERE tenant_id = $1
        AND id IN (
          SELECT id
          FROM mcp_tool_audit_records
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          OFFSET $2
        )
    `,
      [scope.tenantId, MCP_AUDIT_RETENTION_MAX_RECORDS_PER_TENANT],
    )

    return mapAuditRecord(row)
  },
  async listAuditRecords(limit, scope) {
    const clampedLimit = Math.max(1, Math.min(limit, 500))
    const rows = await queryMany<McpAuditRow>(
      `
      SELECT
        id,
        tenant_id,
        connector_id,
        connector_name,
        tool_name,
        status,
        actor_user_id,
        actor_roles,
        detail,
        latency_ms,
        created_at
      FROM mcp_tool_audit_records
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [scope.tenantId, clampedLimit],
    )

    return rows.map(mapAuditRecord)
  },
}

let repositoryAdapters: McpRepositoryAdapters = defaultRepositoryAdapters

export function setMcpRepositoryAdaptersForTests(adapters: McpRepositoryAdapters | null) {
  repositoryAdapters = adapters ?? defaultRepositoryAdapters
}

export async function listMcpConnectorsByTenant(scope: McpConnectorScope) {
  return repositoryAdapters.listConnectors(scope)
}

export async function getMcpConnectorById(id: string, scope: McpConnectorScope) {
  return repositoryAdapters.getConnectorById(id, scope)
}

export async function createMcpConnector(input: CreateConnectorInput, scope: McpConnectorScope) {
  return repositoryAdapters.createConnector(input, scope)
}

export async function updateMcpConnector(
  id: string,
  patch: Partial<Omit<MpcConnectorConfig, "id" | "createdAt">>,
  scope: McpConnectorScope,
) {
  return repositoryAdapters.updateConnector(id, patch, scope)
}

export async function deleteMcpConnector(id: string, scope: McpConnectorScope) {
  return repositoryAdapters.deleteConnector(id, scope)
}

export async function createMcpAuditRecord(record: Omit<MpcToolAuditRecord, "id" | "createdAt">, scope: McpConnectorScope) {
  return repositoryAdapters.createAuditRecord(record, scope)
}

export async function listMcpAuditRecords(limit: number, scope: McpConnectorScope) {
  return repositoryAdapters.listAuditRecords(limit, scope)
}
