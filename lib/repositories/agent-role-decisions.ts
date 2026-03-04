import { randomUUID } from "crypto"

import { queryMany, queryOne, sql } from "@/lib/db"
import type { AgentRole, RolePreferences } from "@/services/agent-role-orchestration"
import type { RelayAgentTool } from "@/lib/skills/relay-tool-registry"

export type AgentDecisionStatus = "allowed" | "blocked" | "completed" | "failed"

export type AgentRoleDecisionRecord = {
  id: string
  sessionId: string
  messageId: string
  tenantId: string
  agentRole: AgentRole
  toolName: RelayAgentTool
  decisionStatus: AgentDecisionStatus
  objectiveWeights: Record<string, number>
  guardrails: Record<string, number>
  preferences: Record<string, unknown>
  outcome: Record<string, unknown>
  createdAt: string
}

let agentRoleDecisionTableReady = false

export async function createAgentRoleDecision(input: {
  sessionId: string
  messageId: string
  tenantId: string
  agentRole: AgentRole
  toolName: RelayAgentTool
  decisionStatus: AgentDecisionStatus
  objectiveWeights: Record<string, number>
  guardrails: Record<string, number>
  preferences?: RolePreferences
  outcome?: Record<string, unknown>
}) {
  await ensureAgentRoleDecisionTable()
  const row = await queryOne<AgentRoleDecisionRecord>(
    `
      INSERT INTO agent_role_decisions (
        id,
        session_id,
        message_id,
        tenant_id,
        agent_role,
        tool_name,
        decision_status,
        objective_weights,
        guardrails,
        preferences,
        outcome
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb)
      RETURNING
        id,
        session_id AS "sessionId",
        message_id AS "messageId",
        tenant_id AS "tenantId",
        agent_role AS "agentRole",
        tool_name AS "toolName",
        decision_status AS "decisionStatus",
        objective_weights AS "objectiveWeights",
        guardrails,
        preferences,
        outcome,
        created_at AS "createdAt"
    `,
    [
      randomUUID(),
      input.sessionId,
      input.messageId,
      input.tenantId,
      input.agentRole,
      input.toolName,
      input.decisionStatus,
      JSON.stringify(input.objectiveWeights),
      JSON.stringify(input.guardrails),
      JSON.stringify(input.preferences ?? {}),
      JSON.stringify(input.outcome ?? {}),
    ],
  )

  if (!row) {
    throw new Error("Failed to persist agent role decision")
  }

  return row
}

export async function listAgentRoleDecisionsBySession(sessionId: string) {
  await ensureAgentRoleDecisionTable()
  return queryMany<AgentRoleDecisionRecord>(
    `
      SELECT
        id,
        session_id AS "sessionId",
        message_id AS "messageId",
        tenant_id AS "tenantId",
        agent_role AS "agentRole",
        tool_name AS "toolName",
        decision_status AS "decisionStatus",
        objective_weights AS "objectiveWeights",
        guardrails,
        preferences,
        outcome,
        created_at AS "createdAt"
      FROM agent_role_decisions
      WHERE session_id = $1
      ORDER BY created_at DESC
    `,
    [sessionId],
  )
}

export async function ensureAgentRoleDecisionTable() {
  if (agentRoleDecisionTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
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

    CREATE INDEX IF NOT EXISTS idx_agent_role_decisions_session_id ON agent_role_decisions(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_role_decisions_role_status ON agent_role_decisions(agent_role, decision_status);
  `)

  agentRoleDecisionTableReady = true
}
