import { queryMany, queryOne } from "@/lib/db"
import { persistTaxComputation, type TaxComputation } from "@/lib/services/tax-service"
import { handleSubscriptionLifecycleEvent, syncAuthUserWithPaymentCustomer } from "@/lib/auth/plugins/runash-payment"

const WEBHOOK_PROVIDER = "stripe"
const DEAD_LETTER_THRESHOLD = Number(process.env.BILLING_WEBHOOK_DEAD_LETTER_THRESHOLD ?? 10)

type WebhookEventStatus = "received" | "processing" | "processed" | "failed" | "dead_letter"

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

function centsToMoney(value: unknown): number | null {
  if (value == null) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed / 100
}

function toIsoTimestamp(value: unknown): string | null {
  if (value == null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return new Date(numeric * 1000).toISOString()
}


async function recordInvoicePaymentAttempt(input: {
  invoiceReference: string | null
  status: string
  amount: number | null
  currency: string | null
  providerReference: string | null
  failureReason?: string | null
  eventId: string
  eventType: string
  occurredAt?: string | null
  metadata?: Record<string, unknown>
  providerEventCreatedAt?: number | null
  checkoutSessionId?: string | null
}) {
  if (!input.invoiceReference) return

  const dedupeKey = `${WEBHOOK_PROVIDER}:${input.eventId}:${input.invoiceReference}:${input.status}`
  const inserted = await queryOne<{ invoice_id: number }>(
    `
      INSERT INTO invoice_payment_attempts (
        id, invoice_id, provider, provider_reference, status, amount, currency, failure_reason,
        event_source, source_event_id, source_event_created_at, checkout_session_id, dedupe_key, metadata, occurred_at, created_at
      )
      SELECT $1, i.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, NOW()
      FROM invoices i
      WHERE i.id::text = $15 OR i.stripe_invoice_id = $15
      ON CONFLICT (dedupe_key) DO NOTHING
      RETURNING invoice_id
    `,
    [
      `${input.eventId}:${input.invoiceReference}:${input.status}`,
      WEBHOOK_PROVIDER,
      input.providerReference,
      input.status,
      input.amount,
      input.currency,
      input.failureReason ?? null,
      input.eventType,
      input.eventId,
      input.providerEventCreatedAt ? toIsoTimestamp(input.providerEventCreatedAt) : null,
      input.checkoutSessionId ?? null,
      dedupeKey,
      JSON.stringify({ source: input.eventType, ...(input.metadata ?? {}) }),
      input.occurredAt ?? null,
      input.invoiceReference,
    ],
  )

  if (!inserted?.invoice_id) return

  await queryMany(
    `
      UPDATE invoices i
      SET status = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN 'paid'
            WHEN latest.status IN ('failed', 'payment_failed') THEN CASE WHEN i.due_date IS NOT NULL AND i.due_date < NOW() THEN 'uncollectible' ELSE 'open' END
            ELSE i.status
          END,
          amount_paid = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN COALESCE(ROUND(latest.amount * 100)::INTEGER, i.amount_paid)
            ELSE i.amount_paid
          END,
          paid_at = CASE
            WHEN latest.status IN ('succeeded', 'paid', 'completed') THEN COALESCE(i.paid_at, NOW())
            WHEN latest.status IN ('failed', 'payment_failed') THEN NULL
            ELSE i.paid_at
          END
      FROM LATERAL (
        SELECT ipa.status, ipa.amount
        FROM invoice_payment_attempts ipa
        WHERE ipa.invoice_id = i.id
        ORDER BY COALESCE(ipa.source_event_created_at, ipa.occurred_at, ipa.created_at) DESC, ipa.created_at DESC
        LIMIT 1
      ) latest
      WHERE i.id = $1
    `,
    [inserted.invoice_id],
  )
}

async function ensureWebhookEventsTable() {
  await queryMany(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'processed', 'failed', 'dead_letter')),
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

  await queryMany(`


    CREATE TABLE IF NOT EXISTS webhook_dead_letters (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      last_error TEXT NOT NULL,
      payload JSONB NOT NULL,
      attempts INTEGER NOT NULL,
      first_received_at TIMESTAMPTZ,
      dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, event_id)
    );

    CREATE TABLE IF NOT EXISTS invoice_payment_attempts (
      id TEXT PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_reference TEXT,
      status TEXT NOT NULL,
      amount NUMERIC(15,2),
      currency TEXT,
      failure_reason TEXT,
      event_source TEXT NOT NULL,
      source_event_id TEXT,
      source_event_created_at TIMESTAMPTZ,
      checkout_session_id TEXT,
      dedupe_key TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS source_event_id TEXT;
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS source_event_created_at TIMESTAMPTZ;
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
    ALTER TABLE invoice_payment_attempts ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

    CREATE INDEX IF NOT EXISTS idx_invoice_payment_attempts_invoice
      ON invoice_payment_attempts(invoice_id, occurred_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payment_attempts_dedupe_key
      ON invoice_payment_attempts(dedupe_key);

    CREATE INDEX IF NOT EXISTS idx_invoice_payment_attempts_checkout_session
      ON invoice_payment_attempts(checkout_session_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS billing_webhook_subscriptions (
      subscription_id TEXT PRIMARY KEY,
      customer_id TEXT,
      status TEXT,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN,
      canceled_at TIMESTAMPTZ,
      last_event_id TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_webhook_invoices (
      invoice_id TEXT PRIMARY KEY,
      subscription_id TEXT,
      customer_id TEXT,
      payment_intent_id TEXT,
      status TEXT,
      amount_due NUMERIC(15,2),
      amount_paid NUMERIC(15,2),
      currency TEXT,
      paid_at TIMESTAMPTZ,
      last_event_id TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_webhook_payments (
      payment_intent_id TEXT PRIMARY KEY,
      customer_id TEXT,
      invoice_id TEXT,
      status TEXT,
      amount NUMERIC(15,2),
      currency TEXT,
      captured_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_reason TEXT,
      last_event_id TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_webhook_payouts (
      payout_id TEXT PRIMARY KEY,
      status TEXT,
      amount NUMERIC(15,2),
      currency TEXT,
      arrival_date TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_code TEXT,
      failure_message TEXT,
      last_event_id TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
  const stripeObject = event.data?.object as Record<string, any> | undefined

  switch (event.type) {
    case "customer.created":
    case "customer.updated": {
      if (!stripeObject?.id) return

      const metadata = stripeObject.metadata && typeof stripeObject.metadata === "object" ? stripeObject.metadata : {}
      await syncAuthUserWithPaymentCustomer({
        paymentCustomerId: String(stripeObject.id),
        userId: metadata.user_id ? String(metadata.user_id) : null,
        userEmail: stripeObject.email ? String(stripeObject.email) : null,
        metadata: {
          source: event.type,
          customerName: stripeObject.name ? String(stripeObject.name) : undefined,
        },
      })

      return
    }
    case "invoice.created":
    case "invoice.payment_succeeded": {
      if (!stripeObject?.id) return
      const invoice = stripeObject
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

        await queryMany(
          `
            INSERT INTO billing_webhook_payments (
              payment_intent_id, customer_id, invoice_id, status, amount, currency, captured_at,
              failed_at, failure_reason, last_event_id, metadata, updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,$8,$9::jsonb,NOW())
            ON CONFLICT (payment_intent_id) DO UPDATE
            SET customer_id = EXCLUDED.customer_id,
                invoice_id = EXCLUDED.invoice_id,
                status = EXCLUDED.status,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                captured_at = EXCLUDED.captured_at,
                failed_at = NULL,
                failure_reason = NULL,
                last_event_id = EXCLUDED.last_event_id,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
          `,
          [
            paymentIntentId,
            invoice.customer ? String(invoice.customer) : null,
            String(invoice.id),
            "succeeded",
            centsToMoney(invoice.amount_paid ?? invoice.total),
            currency,
            toIsoTimestamp(invoice.status_transitions?.paid_at ?? invoice.created),
            event.id,
            JSON.stringify({ source: "invoice.payment_succeeded" }),
          ],
        )
      }

      await recordInvoicePaymentAttempt({
        invoiceReference: String(invoice.id),
        status: "succeeded",
        amount: centsToMoney(invoice.amount_paid ?? invoice.total),
        currency,
        providerReference: paymentIntentId,
        eventId: event.id,
        eventType: event.type,
        occurredAt: toIsoTimestamp(invoice.status_transitions?.paid_at ?? invoice.created),
        providerEventCreatedAt: event.created,
        checkoutSessionId:
          typeof invoice.metadata?.checkout_session_id === "string" ? String(invoice.metadata.checkout_session_id) : null,
      })

      await queryMany(
        `
          INSERT INTO billing_webhook_invoices (
            invoice_id, subscription_id, customer_id, payment_intent_id, status,
            amount_due, amount_paid, currency, paid_at, last_event_id, metadata, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
          ON CONFLICT (invoice_id) DO UPDATE
          SET subscription_id = EXCLUDED.subscription_id,
              customer_id = EXCLUDED.customer_id,
              payment_intent_id = EXCLUDED.payment_intent_id,
              status = EXCLUDED.status,
              amount_due = EXCLUDED.amount_due,
              amount_paid = EXCLUDED.amount_paid,
              currency = EXCLUDED.currency,
              paid_at = EXCLUDED.paid_at,
              last_event_id = EXCLUDED.last_event_id,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
        `,
        [
          String(invoice.id),
          invoice.subscription ? String(invoice.subscription) : null,
          invoice.customer ? String(invoice.customer) : null,
          paymentIntentId,
          String(invoice.status ?? "paid"),
          centsToMoney(invoice.amount_due),
          centsToMoney(invoice.amount_paid),
          currency,
          toIsoTimestamp(invoice.status_transitions?.paid_at ?? invoice.created),
          event.id,
          JSON.stringify({ source: event.type }),
        ],
      )

      return
    }
    case "invoice.payment_failed": {
      if (!stripeObject?.id) return
      const invoice = stripeObject
      const paymentIntentId = invoice.payment_intent ? String(invoice.payment_intent) : null

      await recordInvoicePaymentAttempt({
        invoiceReference: String(invoice.id),
        status: "payment_failed",
        amount: centsToMoney(invoice.amount_due ?? invoice.total),
        currency: String(invoice.currency || "usd").toUpperCase(),
        providerReference: paymentIntentId,
        failureReason: String(invoice.last_finalization_error?.message ?? "payment_failed"),
        eventId: event.id,
        eventType: event.type,
        occurredAt: toIsoTimestamp(invoice.created),
        providerEventCreatedAt: event.created,
        checkoutSessionId:
          typeof invoice.metadata?.checkout_session_id === "string" ? String(invoice.metadata.checkout_session_id) : null,
      })

      await queryMany(
        `
          INSERT INTO billing_webhook_invoices (
            invoice_id, subscription_id, customer_id, payment_intent_id, status,
            amount_due, amount_paid, currency, paid_at, last_event_id, metadata, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10::jsonb,NOW())
          ON CONFLICT (invoice_id) DO UPDATE
          SET subscription_id = EXCLUDED.subscription_id,
              customer_id = EXCLUDED.customer_id,
              payment_intent_id = EXCLUDED.payment_intent_id,
              status = EXCLUDED.status,
              amount_due = EXCLUDED.amount_due,
              amount_paid = EXCLUDED.amount_paid,
              currency = EXCLUDED.currency,
              paid_at = NULL,
              last_event_id = EXCLUDED.last_event_id,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
        `,
        [
          String(invoice.id),
          invoice.subscription ? String(invoice.subscription) : null,
          invoice.customer ? String(invoice.customer) : null,
          paymentIntentId,
          "payment_failed",
          centsToMoney(invoice.amount_due),
          centsToMoney(invoice.amount_paid),
          String(invoice.currency || "usd").toUpperCase(),
          event.id,
          JSON.stringify({ source: event.type, attempt_count: invoice.attempt_count ?? null }),
        ],
      )

      return
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      if (!stripeObject?.id) return
      const subscription = stripeObject

      await handleSubscriptionLifecycleEvent({
        eventId: event.id,
        eventType: event.type,
        paymentCustomerId: subscription.customer ? String(subscription.customer) : null,
        paymentSubscriptionId: String(subscription.id),
        subscriptionStatus: String(subscription.status ?? "unknown"),
        currentPeriodStart: toIsoTimestamp(subscription.current_period_start),
        currentPeriodEnd: toIsoTimestamp(subscription.current_period_end),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        canceledAt: toIsoTimestamp(subscription.canceled_at),
        metadata: {
          source: event.type,
          planId: subscription.items?.data?.[0]?.price?.id ? String(subscription.items.data[0].price.id) : undefined,
        },
      })

      await queryMany(
        `
          INSERT INTO billing_webhook_subscriptions (
            subscription_id, customer_id, status, current_period_start, current_period_end,
            cancel_at_period_end, canceled_at, last_event_id, metadata, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())
          ON CONFLICT (subscription_id) DO UPDATE
          SET customer_id = EXCLUDED.customer_id,
              status = EXCLUDED.status,
              current_period_start = EXCLUDED.current_period_start,
              current_period_end = EXCLUDED.current_period_end,
              cancel_at_period_end = EXCLUDED.cancel_at_period_end,
              canceled_at = EXCLUDED.canceled_at,
              last_event_id = EXCLUDED.last_event_id,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
        `,
        [
          String(subscription.id),
          subscription.customer ? String(subscription.customer) : null,
          String(subscription.status ?? "unknown"),
          toIsoTimestamp(subscription.current_period_start),
          toIsoTimestamp(subscription.current_period_end),
          Boolean(subscription.cancel_at_period_end),
          toIsoTimestamp(subscription.canceled_at),
          event.id,
          JSON.stringify({ source: event.type }),
        ],
      )

      return
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      if (!stripeObject?.id) return
      const paymentIntent = stripeObject
      const isFailed = event.type === "payment_intent.payment_failed"

      await queryMany(
        `
          INSERT INTO billing_webhook_payments (
            payment_intent_id, customer_id, invoice_id, status, amount, currency, captured_at,
            failed_at, failure_reason, last_event_id, metadata, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
          ON CONFLICT (payment_intent_id) DO UPDATE
          SET customer_id = EXCLUDED.customer_id,
              invoice_id = EXCLUDED.invoice_id,
              status = EXCLUDED.status,
              amount = EXCLUDED.amount,
              currency = EXCLUDED.currency,
              captured_at = EXCLUDED.captured_at,
              failed_at = EXCLUDED.failed_at,
              failure_reason = EXCLUDED.failure_reason,
              last_event_id = EXCLUDED.last_event_id,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
        `,
        [
          String(paymentIntent.id),
          paymentIntent.customer ? String(paymentIntent.customer) : null,
          paymentIntent.invoice ? String(paymentIntent.invoice) : null,
          isFailed ? "failed" : "succeeded",
          centsToMoney(paymentIntent.amount_received ?? paymentIntent.amount),
          String(paymentIntent.currency || "usd").toUpperCase(),
          isFailed ? null : toIsoTimestamp(paymentIntent.created),
          isFailed ? toIsoTimestamp(paymentIntent.created) : null,
          isFailed ? String(paymentIntent.last_payment_error?.message ?? "payment_failed") : null,
          event.id,
          JSON.stringify({ source: event.type }),
        ],
      )

      await recordInvoicePaymentAttempt({
        invoiceReference: paymentIntent.invoice ? String(paymentIntent.invoice) : null,
        status: isFailed ? "failed" : "succeeded",
        amount: centsToMoney(paymentIntent.amount_received ?? paymentIntent.amount),
        currency: String(paymentIntent.currency || "usd").toUpperCase(),
        providerReference: String(paymentIntent.id),
        failureReason: isFailed ? String(paymentIntent.last_payment_error?.message ?? "payment_failed") : null,
        eventId: event.id,
        eventType: event.type,
        occurredAt: toIsoTimestamp(paymentIntent.created),
        providerEventCreatedAt: event.created,
        checkoutSessionId:
          typeof paymentIntent.metadata?.checkout_session_id === "string" ? String(paymentIntent.metadata.checkout_session_id) : null,
      })


      return
    }
    case "payout.created":
    case "payout.updated":
    case "payout.paid":
    case "payout.failed":
    case "payout.canceled": {
      if (!stripeObject?.id) return
      const payout = stripeObject
      await queryMany(
        `
          INSERT INTO billing_webhook_payouts (
            payout_id, status, amount, currency, arrival_date, paid_at, failed_at,
            failure_code, failure_message, last_event_id, metadata, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
          ON CONFLICT (payout_id) DO UPDATE
          SET status = EXCLUDED.status,
              amount = EXCLUDED.amount,
              currency = EXCLUDED.currency,
              arrival_date = EXCLUDED.arrival_date,
              paid_at = EXCLUDED.paid_at,
              failed_at = EXCLUDED.failed_at,
              failure_code = EXCLUDED.failure_code,
              failure_message = EXCLUDED.failure_message,
              last_event_id = EXCLUDED.last_event_id,
              metadata = EXCLUDED.metadata,
              updated_at = NOW()
        `,
        [
          String(payout.id),
          String(payout.status ?? "unknown"),
          centsToMoney(payout.amount),
          String(payout.currency || "usd").toUpperCase(),
          toIsoTimestamp(payout.arrival_date),
          toIsoTimestamp(payout.status_transitions?.paid_at),
          toIsoTimestamp(payout.status_transitions?.failed_at),
          payout.failure_code ? String(payout.failure_code) : null,
          payout.failure_message ? String(payout.failure_message) : null,
          event.id,
          JSON.stringify({ source: event.type }),
        ],
      )

      return
    }
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

async function getWebhookEventState(eventId: string) {
  return queryOne<{ status: WebhookEventStatus; processing_attempts: number }>(
    `SELECT status, processing_attempts FROM webhook_events WHERE provider = $1 AND event_id = $2 LIMIT 1`,
    [WEBHOOK_PROVIDER, eventId],
  )
}

async function claimWebhookEventForProcessing(eventId: string) {
  return queryOne<{ processing_attempts: number }>(
    `
      UPDATE webhook_events
      SET status = 'processing',
          updated_at = NOW()
      WHERE provider = $1
        AND event_id = $2
        AND status IN ('received', 'failed', 'dead_letter')
      RETURNING processing_attempts
    `,
    [WEBHOOK_PROVIDER, eventId],
  )
}

async function upsertDeadLetterEvent(input: {
  eventId: string
  eventType: string
  errorMessage: string
  attempts: number
  payload: StripeWebhookEvent
}) {
  await queryMany(
    `
      INSERT INTO webhook_dead_letters (
        id, provider, event_id, event_type, last_error, payload, attempts, first_received_at, dead_lettered_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7,
        (SELECT received_at FROM webhook_events WHERE provider = $2 AND event_id = $3),
        NOW(), NOW()
      )
      ON CONFLICT (provider, event_id)
      DO UPDATE SET
        event_type = EXCLUDED.event_type,
        last_error = EXCLUDED.last_error,
        payload = EXCLUDED.payload,
        attempts = EXCLUDED.attempts,
        dead_lettered_at = NOW(),
        updated_at = NOW()
    `,
    [crypto.randomUUID(), WEBHOOK_PROVIDER, input.eventId, input.eventType, input.errorMessage, JSON.stringify(input.payload), input.attempts],
  )
}

export async function processWebhookEvent(event: StripeWebhookEvent) {
  await ensureWebhookEventsTable()

  const current = await getWebhookEventState(event.id)
  if (!current) throw new Error("webhook_event_not_found")
  if (current.status === "processed") {
    return { processed: true, attempts: current.processing_attempts, duplicateProcessed: true }
  }

  const claimed = await claimWebhookEventForProcessing(event.id)
  if (!claimed) {
    const state = await getWebhookEventState(event.id)
    if (state?.status === "processed") {
      return { processed: true, attempts: state.processing_attempts, duplicateProcessed: true }
    }

    return { processed: false, attempts: state?.processing_attempts ?? 0, duplicateProcessed: true }
  }

  try {
    await runWebhookDomainHandler(event)
    await updateWebhookEventStatus({ eventId: event.id, status: "processed", attemptsIncrement: 1, errorMessage: null })
    return { processed: true, attempts: claimed.processing_attempts + 1, duplicateProcessed: false }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "webhook_processing_failed"
    const nextAttempts = claimed.processing_attempts + 1
    const deadLetter = nextAttempts >= DEAD_LETTER_THRESHOLD

    await updateWebhookEventStatus({
      eventId: event.id,
      status: deadLetter ? "dead_letter" : "failed",
      attemptsIncrement: 1,
      errorMessage: message,
      scheduleRetryMinutes: retryDelayMinutes(nextAttempts),
    })

    if (deadLetter) {
      await upsertDeadLetterEvent({
        eventId: event.id,
        eventType: event.type,
        errorMessage: message,
        attempts: nextAttempts,
        payload: event,
      })
    }

    throw new Error(message)
  }
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
      ORDER BY COALESCE((payload ->> 'created')::bigint, 0) ASC, received_at ASC
      LIMIT $2
    `,
    [WEBHOOK_PROVIDER, Math.max(1, limit)],
  )

  let replayed = 0
  let failed = 0

  for (const row of rows) {
    try {
      const result = await processWebhookEvent(row.payload)
      if (result.processed) {
        replayed += 1
      }
    } catch {
      failed += 1
    }
  }

  return { scanned: rows.length, replayed, failed }
}


export async function replayWebhookEventById(eventId: string) {
  await ensureWebhookEventsTable()

  const row = await queryOne<{ payload: StripeWebhookEvent }>(
    `SELECT payload FROM webhook_events WHERE provider = $1 AND event_id = $2 LIMIT 1`,
    [WEBHOOK_PROVIDER, eventId],
  )

  if (!row?.payload) {
    return { found: false, processed: false }
  }

  await processWebhookEvent(row.payload)
  return { found: true, processed: true }
}
export async function rollbackWebhookEvent(eventId: string) {
  await ensureWebhookEventsTable()

  const updated = await queryOne<{ event_id: string }>(
    `
      UPDATE webhook_events
      SET status = 'received',
          last_error = NULL,
          next_retry_at = NULL,
          updated_at = NOW()
      WHERE provider = $1
        AND event_id = $2
        AND status IN ('failed', 'dead_letter')
      RETURNING event_id
    `,
    [WEBHOOK_PROVIDER, eventId],
  )

  return Boolean(updated?.event_id)
}

export async function listWebhookEvents(input: { status?: WebhookEventStatus; limit?: number }) {
  await ensureWebhookEventsTable()

  return queryMany<{
    event_id: string
    event_type: string
    status: WebhookEventStatus
    processing_attempts: number
    last_error: string | null
    received_at: string
    updated_at: string
  }>(
    `
      SELECT event_id, event_type, status, processing_attempts, last_error,
             received_at::text, updated_at::text
      FROM webhook_events
      WHERE provider = $1
        AND ($2::text IS NULL OR status = $2)
      ORDER BY received_at DESC
      LIMIT $3
    `,
    [WEBHOOK_PROVIDER, input.status ?? null, Math.max(1, input.limit ?? 50)],
  )
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
