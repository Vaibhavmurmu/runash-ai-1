CREATE TABLE IF NOT EXISTS agent_role_decisions (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  decision_status TEXT NOT NULL,
  objective_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_role_decisions_session_id ON agent_role_decisions (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_role_decisions_role_status ON agent_role_decisions (agent_role, decision_status);
