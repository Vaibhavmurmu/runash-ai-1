CREATE TABLE IF NOT EXISTS mcp_connectors (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  transport TEXT NOT NULL CHECK (transport IN ('http', 'sse', 'stdio')),
  auth_type TEXT NOT NULL CHECK (auth_type IN ('none', 'bearer', 'api_key', 'oauth')),
  auth_header_name TEXT,
  auth_token_ref TEXT,
  enabled_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  permission_allow_all_users BOOLEAN NOT NULL DEFAULT TRUE,
  permission_allowed_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  permission_allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_connectors_tenant_created_at ON mcp_connectors (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mcp_tool_audit_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('allowed', 'denied', 'success', 'failed', 'fallback')),
  actor_user_id TEXT,
  actor_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  detail TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_mcp_tool_audit_connector FOREIGN KEY (connector_id) REFERENCES mcp_connectors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_audit_tenant_created_at ON mcp_tool_audit_records (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_audit_connector_created_at ON mcp_tool_audit_records (connector_id, created_at DESC);
