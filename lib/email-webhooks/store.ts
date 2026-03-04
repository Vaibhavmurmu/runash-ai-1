import { neon } from "@neondatabase/serverless"
import { type EmailWebhookProvider, type NormalizedEmailWebhookEvent } from "@/lib/email-webhooks/types"

const sql = neon(process.env.DATABASE_URL!)

let initialized = false

async function ensureTables() {
  if (initialized) return

  await sql`
    CREATE TABLE IF NOT EXISTS email_webhook_events (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      message_id TEXT,
      event_type TEXT NOT NULL,
      recipient_email TEXT,
      status TEXT NOT NULL DEFAULT 'processed',
      error_message TEXT,
      payload JSONB,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, event_id)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_webhook_events_created_at
    ON email_webhook_events(created_at DESC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_email_webhook_events_status
    ON email_webhook_events(status, created_at DESC)
  `

  initialized = true
}

export async function wasEventProcessed(provider: EmailWebhookProvider, eventId: string): Promise<boolean> {
  await ensureTables()
  const rows = await sql`
    SELECT 1 FROM email_webhook_events
    WHERE provider = ${provider} AND event_id = ${eventId}
    LIMIT 1
  `
  return rows.length > 0
}

export async function recordWebhookEvent(event: NormalizedEmailWebhookEvent, status: "processed" | "failed", errorMessage?: string) {
  await ensureTables()
  await sql`
    INSERT INTO email_webhook_events (
      provider,
      event_id,
      message_id,
      event_type,
      recipient_email,
      status,
      error_message,
      payload
    ) VALUES (
      ${event.provider},
      ${event.providerEventId},
      ${event.messageId},
      ${event.type},
      ${event.recipientEmail},
      ${status},
      ${errorMessage || null},
      ${JSON.stringify(event.raw)}
    )
    ON CONFLICT (provider, event_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      payload = EXCLUDED.payload,
      processed_at = NOW()
  `
}


export async function recordWebhookRejection(provider: EmailWebhookProvider, payload: {
  reason: string
  eventId?: string
  rawBody?: string
}) {
  await ensureTables()
  const eventId = payload.eventId || `rejected:${Date.now()}:${Math.random().toString(16).slice(2)}`
  await sql`
    INSERT INTO email_webhook_events (
      provider,
      event_id,
      event_type,
      status,
      error_message,
      payload
    ) VALUES (
      ${provider},
      ${eventId},
      ${"verification_failed"},
      ${"rejected"},
      ${payload.reason.slice(0, 500)},
      ${JSON.stringify({ rawBody: payload.rawBody?.slice(0, 5000) })}
    )
    ON CONFLICT (provider, event_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      payload = EXCLUDED.payload,
      processed_at = NOW()
  `
}

export async function getWebhookDiagnostics(options?: { limit?: number; provider?: string; status?: string }) {
  await ensureTables()
  const limit = Math.max(1, Math.min(options?.limit || 100, 500))

  const rows = await sql.query(
    `SELECT
      id,
      provider,
      event_id,
      message_id,
      event_type,
      recipient_email,
      status,
      error_message,
      payload,
      processed_at,
      created_at
    FROM email_webhook_events
    WHERE ($1::text IS NULL OR provider = $1)
      AND ($2::text IS NULL OR status = $2)
    ORDER BY created_at DESC
    LIMIT $3`,
    [options?.provider || null, options?.status || null, limit],
  )

  const failures = await sql.query(
    `SELECT provider, COUNT(*)::int AS count
     FROM email_webhook_events
     WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY provider
     ORDER BY count DESC`,
  )

  const rejections = await sql.query(
    `SELECT provider, COUNT(*)::int AS count
     FROM email_webhook_events
     WHERE status = 'rejected' AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY provider
     ORDER BY count DESC`,
  )

  const reconciliation = await sql.query(
    `SELECT provider, event_type, COUNT(*)::int AS count
     FROM email_webhook_events
     WHERE status = 'processed' AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY provider, event_type
     ORDER BY provider, event_type`,
  )

  const recentSummary = await sql.query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'processed')::int AS processed,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      MAX(created_at) AS last_event_at
     FROM email_webhook_events
     WHERE created_at > NOW() - INTERVAL '1 hour'`,
  )

  const recent = recentSummary[0] || { total: 0, processed: 0, failed: 0, rejected: 0, last_event_at: null }
  const total = Number(recent.total || 0)
  const failedCount = Number(recent.failed || 0)
  const rejectedCount = Number(recent.rejected || 0)
  const unhealthy = total > 0 && (failedCount + rejectedCount) / total >= 0.25

  return {
    events: rows,
    failuresLast24h: failures,
    rejectedLast24h: rejections,
    reconciliationLast24h: reconciliation,
    status: {
      totalLastHour: total,
      failedLastHour: failedCount,
      rejectedLastHour: rejectedCount,
      failureRateLastHour: total > 0 ? (failedCount + rejectedCount) / total : 0,
      lastEventAt: recent.last_event_at,
      level: unhealthy ? "degraded" : "healthy",
      action: unhealthy
        ? "Investigate webhook signature verification and provider delivery events."
        : "No action required.",
    },
  }
}
