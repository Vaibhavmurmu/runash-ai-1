import { randomUUID } from "crypto"
import { queryMany } from "@/lib/db"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

export type PaymentLifecycleEventType =
  | "plan_upgrade_initiated"
  | "plan_upgrade_completed"
  | "invoice_generated"
  | "invoice_paid"
  | "invoice_failed"
  | "payment_method_updated"
  | "payment_method_expired"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_canceled"
  | "subscription_trial_ending"

export type PaymentLifecycleTemplateKey =
  | "billing.plan-upgrade-initiated"
  | "billing.plan-upgrade-completed"
  | "billing.invoice-generated"
  | "billing.invoice-paid"
  | "billing.invoice-failed"
  | "billing.payment-method-updated"
  | "billing.payment-method-expired"
  | "billing.subscription-started"
  | "billing.subscription-renewed"
  | "billing.subscription-canceled"
  | "billing.subscription-trial-ending"

type LifecycleTemplateDescriptor = {
  templateKey: PaymentLifecycleTemplateKey
  defaultTitle: string
}

const TEMPLATE_MAP: Record<PaymentLifecycleEventType, LifecycleTemplateDescriptor> = {
  plan_upgrade_initiated: { templateKey: "billing.plan-upgrade-initiated", defaultTitle: "Plan upgrade initiated" },
  plan_upgrade_completed: { templateKey: "billing.plan-upgrade-completed", defaultTitle: "Plan upgrade completed" },
  invoice_generated: { templateKey: "billing.invoice-generated", defaultTitle: "Invoice generated" },
  invoice_paid: { templateKey: "billing.invoice-paid", defaultTitle: "Invoice paid" },
  invoice_failed: { templateKey: "billing.invoice-failed", defaultTitle: "Invoice payment failed" },
  payment_method_updated: { templateKey: "billing.payment-method-updated", defaultTitle: "Payment method updated" },
  payment_method_expired: { templateKey: "billing.payment-method-expired", defaultTitle: "Payment method expired" },
  subscription_started: { templateKey: "billing.subscription-started", defaultTitle: "Subscription started" },
  subscription_renewed: { templateKey: "billing.subscription-renewed", defaultTitle: "Subscription renewed" },
  subscription_canceled: { templateKey: "billing.subscription-canceled", defaultTitle: "Subscription canceled" },
  subscription_trial_ending: { templateKey: "billing.subscription-trial-ending", defaultTitle: "Trial ending soon" },
}

const SENSITIVE_METADATA_KEY_PATTERN = /(token|secret|authorization|auth|password|session|customer|provider|payment.?method|card|cvv|email)/i

export type PaymentLifecycleMetadata = {
  amount?: number | null
  currency?: string | null
  plan?: string | null
  previousPlan?: string | null
  nextBillingDate?: string | null
  invoiceLink?: string | null
  invoiceId?: string | null
  subscriptionId?: string | null
  paymentMethodLast4?: string | null
  reason?: string | null
  [key: string]: unknown
}

export type PaymentLifecycleEventInput = {
  eventType: PaymentLifecycleEventType
  userId?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  invoiceId?: string | null
  source: string
  metadata?: PaymentLifecycleMetadata
}

let lifecycleTablesReady = false

function redactLifecycleMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizePaymentActivityDetails(metadata)

  for (const [key] of Object.entries(sanitized)) {
    if (SENSITIVE_METADATA_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]"
    }
  }

  return sanitized
}

async function ensureLifecycleEventTable() {
  if (lifecycleTablesReady) return

  await queryMany(`
    CREATE TABLE IF NOT EXISTS payment_lifecycle_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      template_key TEXT NOT NULL,
      template_title TEXT NOT NULL,
      user_id TEXT,
      customer_id TEXT,
      subscription_id TEXT,
      invoice_id TEXT,
      source TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payment_lifecycle_events_user_created
      ON payment_lifecycle_events (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payment_lifecycle_events_type_created
      ON payment_lifecycle_events (event_type, created_at DESC);
  `)

  lifecycleTablesReady = true
}

export async function emitPaymentLifecycleEvent(input: PaymentLifecycleEventInput) {
  await ensureLifecycleEventTable()

  const template = TEMPLATE_MAP[input.eventType]
  const metadata = redactLifecycleMetadata({
    amount: input.metadata?.amount ?? null,
    currency: input.metadata?.currency ?? null,
    plan: input.metadata?.plan ?? null,
    previousPlan: input.metadata?.previousPlan ?? null,
    nextBillingDate: input.metadata?.nextBillingDate ?? null,
    invoiceLink: input.metadata?.invoiceLink ?? null,
    invoiceId: input.metadata?.invoiceId ?? input.invoiceId ?? null,
    subscriptionId: input.metadata?.subscriptionId ?? input.subscriptionId ?? null,
    ...(input.metadata ?? {}),
  })

  await queryMany(
    `
      INSERT INTO payment_lifecycle_events (
        id, event_type, template_key, template_title, user_id, customer_id, subscription_id, invoice_id, source, metadata, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
    `,
    [
      randomUUID(),
      input.eventType,
      template.templateKey,
      template.defaultTitle,
      input.userId ?? null,
      input.customerId ?? null,
      input.subscriptionId ?? null,
      input.invoiceId ?? null,
      input.source,
      JSON.stringify(metadata),
    ],
  )

  console.info(
    "[billing.lifecycle.event]",
    JSON.stringify({
      eventType: input.eventType,
      templateKey: template.templateKey,
      source: input.source,
      userId: input.userId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      invoiceId: input.invoiceId ?? null,
      metadata,
    }),
  )

  return {
    eventType: input.eventType,
    templateKey: template.templateKey,
    metadata,
  }
}
