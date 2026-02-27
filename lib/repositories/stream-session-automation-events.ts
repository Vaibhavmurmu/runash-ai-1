import { queryMany, queryOne, sql } from "@/lib/db"

export interface StreamSessionAutomationEventRecord {
  id: string
  sessionId: string
  streamId: string | null
  eventType: string
  stage: "intermediate" | "final"
  actorRole: string | null
  eventPayload: Record<string, unknown>
  createdAt: Date
}

let streamSessionAutomationEventsReady = false

async function ensureStreamSessionAutomationEventsTable() {
  if (streamSessionAutomationEventsReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS stream_session_automation_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      stream_id TEXT,
      event_type TEXT NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN ('intermediate', 'final')),
      actor_role TEXT,
      event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stream_session_automation_events_session
      ON stream_session_automation_events (session_id, created_at ASC);
  `)

  streamSessionAutomationEventsReady = true
}

function mapRow(row: StreamSessionAutomationEventRecord): StreamSessionAutomationEventRecord {
  return {
    ...row,
    eventPayload: row.eventPayload ?? {},
    createdAt: new Date(row.createdAt),
  }
}

export async function createStreamSessionAutomationEvent(input: {
  id: string
  sessionId: string
  streamId?: string | null
  eventType: string
  stage: "intermediate" | "final"
  actorRole?: string | null
  eventPayload?: Record<string, unknown>
}): Promise<StreamSessionAutomationEventRecord> {
  await ensureStreamSessionAutomationEventsTable()

  const row = await queryOne<StreamSessionAutomationEventRecord>(
    `
      INSERT INTO stream_session_automation_events (
        id,
        session_id,
        stream_id,
        event_type,
        stage,
        actor_role,
        event_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING
        id,
        session_id AS "sessionId",
        stream_id AS "streamId",
        event_type AS "eventType",
        stage,
        actor_role AS "actorRole",
        event_payload AS "eventPayload",
        created_at AS "createdAt"
    `,
    [
      input.id,
      input.sessionId,
      input.streamId ?? null,
      input.eventType,
      input.stage,
      input.actorRole ?? null,
      JSON.stringify(input.eventPayload ?? {}),
    ],
  )

  if (!row) throw new Error("Failed to persist stream session automation event")
  return mapRow(row)
}

export async function listStreamSessionAutomationEvents(sessionId: string): Promise<StreamSessionAutomationEventRecord[]> {
  await ensureStreamSessionAutomationEventsTable()

  const rows = await queryMany<StreamSessionAutomationEventRecord>(
    `
      SELECT
        id,
        session_id AS "sessionId",
        stream_id AS "streamId",
        event_type AS "eventType",
        stage,
        actor_role AS "actorRole",
        event_payload AS "eventPayload",
        created_at AS "createdAt"
      FROM stream_session_automation_events
      WHERE session_id = $1
      ORDER BY created_at ASC
    `,
    [sessionId],
  )

  return rows.map(mapRow)
}
