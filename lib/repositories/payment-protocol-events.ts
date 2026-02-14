import { queryOne, sql } from "@/lib/db"

export type PaymentProtocolEventType =
  | "intent_locked"
  | "consensus_verified"
  | "execution_released"
  | "execution_blocked"
  | "confirmation_required"

export interface PaymentProtocolEventRecord {
  id: string
  intentId: string
  lockId: string
  eventType: PaymentProtocolEventType
  eventPayload: Record<string, unknown>
  createdAt: Date
}

export interface PaymentConsensusRecord {
  id: string
  intentId: string
  lockId: string
  verifierSet: string[]
  approvals: string[]
  deterministicChecks: Array<Record<string, unknown>>
  createdAt: Date
}

let paymentProtocolTablesReady = false

async function ensurePaymentProtocolTables() {
  if (paymentProtocolTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS payment_protocol_events (
      id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL,
      lock_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_consensus_records (
      id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL,
      lock_id TEXT NOT NULL,
      verifier_set JSONB NOT NULL DEFAULT '[]'::jsonb,
      approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
      deterministic_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_protocol_events_intent_created
      ON payment_protocol_events(intent_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payment_consensus_records_intent_created
      ON payment_consensus_records(intent_id, created_at DESC);
  `)

  paymentProtocolTablesReady = true
}

function mapEventRow(row: {
  id: string
  intentId: string
  lockId: string
  eventType: PaymentProtocolEventType
  eventPayload: Record<string, unknown>
  createdAt: Date
}): PaymentProtocolEventRecord {
  return {
    ...row,
    eventPayload: row.eventPayload ?? {},
    createdAt: new Date(row.createdAt),
  }
}

function mapConsensusRow(row: {
  id: string
  intentId: string
  lockId: string
  verifierSet: string[]
  approvals: string[]
  deterministicChecks: Array<Record<string, unknown>>
  createdAt: Date
}): PaymentConsensusRecord {
  return {
    ...row,
    verifierSet: row.verifierSet ?? [],
    approvals: row.approvals ?? [],
    deterministicChecks: row.deterministicChecks ?? [],
    createdAt: new Date(row.createdAt),
  }
}

export async function createPaymentProtocolEvent(input: {
  id: string
  intentId: string
  lockId: string
  eventType: PaymentProtocolEventType
  eventPayload: Record<string, unknown>
}): Promise<PaymentProtocolEventRecord> {
  await ensurePaymentProtocolTables()

  const row = await queryOne<{
    id: string
    intentId: string
    lockId: string
    eventType: PaymentProtocolEventType
    eventPayload: Record<string, unknown>
    createdAt: Date
  }>(
    `
      INSERT INTO payment_protocol_events (
        id, intent_id, lock_id, event_type, event_payload
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING
        id,
        intent_id AS "intentId",
        lock_id AS "lockId",
        event_type AS "eventType",
        event_payload AS "eventPayload",
        created_at AS "createdAt"
    `,
    [input.id, input.intentId, input.lockId, input.eventType, JSON.stringify(input.eventPayload ?? {})],
  )

  if (!row) throw new Error("Failed to persist payment protocol event")
  return mapEventRow(row)
}

export async function createPaymentConsensusRecord(input: {
  id: string
  intentId: string
  lockId: string
  verifierSet: string[]
  approvals: string[]
  deterministicChecks: Array<Record<string, unknown>>
}): Promise<PaymentConsensusRecord> {
  await ensurePaymentProtocolTables()

  const row = await queryOne<{
    id: string
    intentId: string
    lockId: string
    verifierSet: string[]
    approvals: string[]
    deterministicChecks: Array<Record<string, unknown>>
    createdAt: Date
  }>(
    `
      INSERT INTO payment_consensus_records (
        id, intent_id, lock_id, verifier_set, approvals, deterministic_checks
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
      RETURNING
        id,
        intent_id AS "intentId",
        lock_id AS "lockId",
        verifier_set AS "verifierSet",
        approvals,
        deterministic_checks AS "deterministicChecks",
        created_at AS "createdAt"
    `,
    [
      input.id,
      input.intentId,
      input.lockId,
      JSON.stringify(input.verifierSet ?? []),
      JSON.stringify(input.approvals ?? []),
      JSON.stringify(input.deterministicChecks ?? []),
    ],
  )

  if (!row) throw new Error("Failed to persist payment consensus record")
  return mapConsensusRow(row)
}
