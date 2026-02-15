import { queryMany, queryOne } from "@/lib/db"
import { persistTaxComputation, type TaxComputation } from "@/lib/services/tax-service"

const WEBHOOK_PROVIDER = "stripe"
const MAX_PROCESSING_ATTEMPTS = Number(process.env.BILLING_WEBHOOK_MAX_ATTEMPTS ?? 5)
const DEAD_LETTER_THRESHOLD = Number(process.env.BILLING_WEBHOOK_DEAD_LETTER_THRESHOLD ?? 10)

type WebhookEventStatus = "received" | "processed" | "failed" | "dead_letter"

type WebhookEventRecord = {
  id: string
  event_id: string
  event_type: string
  status: WebhookEventStatus
  processing_attempts: number
}

type StripeWebhookEvent = {
  id: string
  type: string
  created?: number
  data?: {
    object?: Record<string, any>
  }
}

function mapStripeInvoiceTax(invoice: Record<string, any>): TaxComputation {
  const subtotal = Number(invoice.subtotal ?? 0) / 100
  const total = Number(invoice.total ?? invoice.amount_paid ?? 0) / 100
  const totalTaxAmount = Number(invoice.total_taxes?.[0]?.amount ?? invoice.tax ?? 0) / 100

  const countryCode = String(invoice.customer_address?.country || invoice.account_country || "UN").toUpperCase()
  const stateCode = invoice.customer_address?.state ? String(invoice.customer_address.state).toUpperCase() : null

  const lineItems = Array.isArray(invoice.total_taxes)
    ? invoice.total_taxes.map((tax: Record<string, any>) => ({
        jurisdictionLevel: stateCode ? ("state" as const) : ("country" as const),
        jurisdictionCode: stateCode ?? countryCode,
        taxType: String(tax.taxability_reason || "tax"),
        taxName: String(tax.tax_rate_details?.display_name || tax.tax_rate_details?.tax_type || "Tax"),
        ratePercent: Number(tax.tax_rate_details?.percentage_decimal ?? tax.tax_rate_details?.percentage ?? 0),
        taxableAmount: subtotal,
        taxAmount: Number(tax.amount ?? 0) / 100,
        metadata: {
          stripe_tax_rate: tax.tax_rate,
          source: "stripe_invoice",
        },
      }))
    : []

  return {
    countryCode,
    stateCode,
    taxableAmount: subtotal,
    totalTaxAmount,
    totalAmount: total,
    lineItems,
    jurisdictionDetails: {
      source: "stripe_invoice",
      city: invoice.customer_address?.city ?? null,
      postalCode: invoice.customer_address?.postal_code ?? null,
      taxAutomatic: Boolean(invoice.automatic_tax?.enabled),
    },
  }
}

async function ensureWebhookEventsTable() {
  await queryMany(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed', 'dead_letter')),
      payload JSONB NOT NULL,
      processing_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TIMESTAMPTZ,
      processed_at TIMESTAMPTZ,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, event_id)
    );
  `)

  await queryMany(`
    CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
    ON webhook_events(status, next_retry_at, received_at);
  `)
}

export async function recordWebhookEvent(event: StripeWebhookEvent): Promise<{ duplicate: boolean; recordId: string }> {
  await ensureWebhookEventsTable()

  const inserted = await queryOne<{ id: string }>(
    `
      INSERT INTO webhook_events (id, provider, event_id, event_type, status, payload)
      VALUES ($1, $2, $3, $4, 'received', $5::jsonb)
      ON CONFLICT (provider, event_id) DO NOTHING
      RETURNING id
    `,
    [crypto.randomUUID(), WEBHOOK_PROVIDER, event.id, event.type, JSON.stringify(event)],
  )

  if (!inserted?.id) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM webhook_events WHERE provider = $1 AND event_id = $2 LIMIT 1`,
      [WEBHOOK_PROVIDER, event.id],
    )

    return { duplicate: true, recordId: existing?.id ?? "" }
  }

  return { duplicate: false, recordId: inserted.id }
}

async function runWebhookDomainHandler(event: StripeWebhookEvent) {
  const invoice = event.data?.object as Record<string, any> | undefined

  switch (event.type) {
    case "invoice.payment_succeeded": {
      if (!invoice?.id) return
      const taxComputation = mapStripeInvoiceTax(invoice)
      const currency = String(invoice.currency || "usd").toUpperCase()

      await persistTaxComputation({
        sourceType: "invoice",
        sourceId: String(invoice.id),
        currency,
        computation: taxComputation,
      })

      const paymentIntentId = invoice.payment_intent ? String(invoice.payment_intent) : null
      if (paymentIntentId) {
        await persistTaxComputation({
          sourceType: "transaction",
          sourceId: paymentIntentId,
          currency,
          computation: taxComputation,
        })
      }
      return
    }
    case "invoice.payment_failed":
      return
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return
    case "payout.created":
    case "payout.updated":
    case "payout.paid":
    case "payout.failed":
    case "payout.canceled":
      return
    default:
      return
  }
}

async function updateWebhookEventStatus(input: {
  eventId: string
  status: WebhookEventStatus
  attemptsIncrement?: number
  errorMessage?: string | null
  scheduleRetryMinutes?: number | null
}) {
  const retryInterval = input.scheduleRetryMinutes ? `${Math.max(1, input.scheduleRetryMinutes)} minutes` : null

  await queryMany(
    `
      UPDATE webhook_events
      SET status = $3,
          processing_attempts = processing_attempts + $4,
          last_error = $5,
          next_retry_at = CASE WHEN $6::text IS NULL THEN NULL ELSE NOW() + ($6::text)::interval END,
          processed_at = CASE WHEN $3 = 'processed' THEN NOW() ELSE processed_at END,
          updated_at = NOW()
      WHERE provider = $1 AND event_id = $2
    `,
    [WEBHOOK_PROVIDER, input.eventId, input.status, input.attemptsIncrement ?? 0, input.errorMessage ?? null, retryInterval],
  )
}

function retryDelayMinutes(attempt: number) {
  return Math.min(60, Math.pow(2, Math.max(0, attempt - 1)))
}

export async function processWebhookEvent(event: StripeWebhookEvent) {
  for (let attempt = 1; attempt <= Math.max(1, MAX_PROCESSING_ATTEMPTS); attempt += 1) {
    try {
      await runWebhookDomainHandler(event)
      await updateWebhookEventStatus({ eventId: event.id, status: "processed", attemptsIncrement: 1, errorMessage: null })
      return { processed: true, attempts: attempt }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "webhook_processing_failed"
      const finalAttempt = attempt >= Math.max(1, MAX_PROCESSING_ATTEMPTS)
      const nextStatus: WebhookEventStatus = finalAttempt ? "failed" : "received"

      await updateWebhookEventStatus({
        eventId: event.id,
        status: nextStatus,
        attemptsIncrement: 1,
        errorMessage: message,
        scheduleRetryMinutes: finalAttempt ? retryDelayMinutes(attempt) : null,
      })

      if (finalAttempt) {
        throw new Error(message)
      }
    }
  }

  throw new Error("unreachable_webhook_processing_state")
}

export async function replayFailedWebhookEvents(limit = 25) {
  await ensureWebhookEventsTable()

  const rows = await queryMany<{
    event_id: string
    payload: StripeWebhookEvent
    processing_attempts: number
  }>(
    `
      SELECT event_id, payload, processing_attempts
      FROM webhook_events
      WHERE provider = $1
        AND status IN ('failed', 'dead_letter')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY received_at ASC
      LIMIT $2
    `,
    [WEBHOOK_PROVIDER, Math.max(1, limit)],
  )

  let replayed = 0
  let failed = 0

  for (const row of rows) {
    try {
      await runWebhookDomainHandler(row.payload)
      replayed += 1
      await updateWebhookEventStatus({ eventId: row.event_id, status: "processed", attemptsIncrement: 1, errorMessage: null })
    } catch (error) {
      failed += 1
      const nextAttempts = row.processing_attempts + 1
      const deadLetter = nextAttempts >= DEAD_LETTER_THRESHOLD
      const message = error instanceof Error ? error.message.slice(0, 500) : "webhook_replay_failed"

      await updateWebhookEventStatus({
        eventId: row.event_id,
        status: deadLetter ? "dead_letter" : "failed",
        attemptsIncrement: 1,
        errorMessage: message,
        scheduleRetryMinutes: retryDelayMinutes(nextAttempts),
      })
    }
  }

  return { scanned: rows.length, replayed, failed }
}

export async function getWebhookEventByEventId(eventId: string) {
  await ensureWebhookEventsTable()

  return queryOne<WebhookEventRecord>(
    `
      SELECT id, event_id, event_type, status, processing_attempts
      FROM webhook_events
      WHERE provider = $1 AND event_id = $2
      LIMIT 1
    `,
    [WEBHOOK_PROVIDER, eventId],
  )
}
