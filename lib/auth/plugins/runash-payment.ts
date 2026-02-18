import { createHmac, timingSafeEqual } from "node:crypto"
import { queryMany, queryOne } from "@/lib/db"

export type PaymentProvider = "stripe"

type PaymentAuthLinkRecord = {
  user_id: string
  payment_customer_id: string
}

export type PaymentAuthSyncInput = {
  paymentCustomerId: string
  userId?: string | null
  userEmail?: string | null
  provider?: PaymentProvider
  metadata?: Record<string, unknown>
}

export type SubscriptionLifecycleInput = {
  eventId: string
  eventType: string
  paymentCustomerId: string | null
  paymentSubscriptionId: string
  subscriptionStatus: string
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: string | null
  metadata?: Record<string, unknown>
}

type SignatureVerificationInput = {
  payload: string
  secret: string
  signatureHeader: string
  toleranceSeconds?: number
}

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300

async function ensurePaymentAuthLinkTable() {
  await queryMany(`
    CREATE TABLE IF NOT EXISTS payment_auth_customer_links (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      payment_customer_id TEXT NOT NULL,
      payment_provider TEXT NOT NULL DEFAULT 'stripe',
      payment_subscription_id TEXT,
      subscription_status TEXT,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN,
      canceled_at TIMESTAMPTZ,
      last_event_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (payment_provider, payment_customer_id)
    );

    ALTER TABLE payment_auth_customer_links
      DROP CONSTRAINT IF EXISTS payment_auth_customer_links_payment_provider_user_id_key;

    ALTER TABLE payment_auth_customer_links
      ALTER COLUMN user_id DROP NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_auth_customer_links_provider_user
    ON payment_auth_customer_links(payment_provider, user_id)
    WHERE user_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payment_auth_customer_links_subscription
    ON payment_auth_customer_links(payment_subscription_id, updated_at DESC);
  `)
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return new Date(value * 1000).toISOString()
}

async function resolveAuthUserByIdentity(input: { userId?: string | null; userEmail?: string | null }) {
  if (input.userId) {
    const userById = await queryOne<{ id: string; email: string | null }>(
      `SELECT id::text AS id, email FROM users WHERE id::text = $1 LIMIT 1`,
      [input.userId],
    )

    if (userById?.id) return userById
  }

  if (input.userEmail) {
    return queryOne<{ id: string; email: string | null }>(
      `SELECT id::text AS id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [input.userEmail],
    )
  }

  return null
}

export async function syncAuthUserWithPaymentCustomer(input: PaymentAuthSyncInput) {
  await ensurePaymentAuthLinkTable()

  const provider = input.provider ?? "stripe"
  const customerId = input.paymentCustomerId.trim()

  if (!customerId) {
    return { linked: false, reason: "missing_customer_id" as const }
  }

  const resolvedUser = await resolveAuthUserByIdentity({ userId: input.userId, userEmail: input.userEmail })
  if (!resolvedUser?.id) {
    return { linked: false, reason: "auth_user_not_found" as const }
  }

  await queryMany(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`)

  await queryMany(`UPDATE users SET stripe_customer_id = $2 WHERE id::text = $1`, [resolvedUser.id, customerId])

  await queryMany(
    `
      INSERT INTO payment_auth_customer_links (
        id, user_id, payment_customer_id, payment_provider, metadata, updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      ON CONFLICT (payment_provider, payment_customer_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `,
    [crypto.randomUUID(), resolvedUser.id, customerId, provider, JSON.stringify(input.metadata ?? {})],
  )

  return {
    linked: true,
    userId: resolvedUser.id,
    paymentCustomerId: customerId,
    provider,
  }
}

export async function handleSubscriptionLifecycleEvent(input: SubscriptionLifecycleInput) {
  await ensurePaymentAuthLinkTable()

  if (!input.paymentSubscriptionId) {
    return { stored: false, reason: "missing_subscription_id" as const }
  }

  if (!input.paymentCustomerId) {
    return { stored: false, reason: "missing_customer_id" as const }
  }

  const existingLink = await queryOne<PaymentAuthLinkRecord>(
    `
      SELECT user_id, payment_customer_id
      FROM payment_auth_customer_links
      WHERE payment_provider = 'stripe' AND payment_customer_id = $1
      LIMIT 1
    `,
    [input.paymentCustomerId],
  )

  const userId = existingLink?.user_id ?? null

  await queryMany(
    `
      INSERT INTO payment_auth_customer_links (
        id, user_id, payment_customer_id, payment_provider, payment_subscription_id,
        subscription_status, current_period_start, current_period_end, cancel_at_period_end,
        canceled_at, last_event_id, metadata, updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'stripe',
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::jsonb,
        NOW()
      )
      ON CONFLICT (payment_provider, payment_customer_id)
      DO UPDATE SET
        payment_subscription_id = EXCLUDED.payment_subscription_id,
        subscription_status = EXCLUDED.subscription_status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        canceled_at = EXCLUDED.canceled_at,
        last_event_id = EXCLUDED.last_event_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `,
    [
      crypto.randomUUID(),
      userId,
      input.paymentCustomerId,
      input.paymentSubscriptionId,
      input.subscriptionStatus,
      input.currentPeriodStart ?? null,
      input.currentPeriodEnd ?? null,
      Boolean(input.cancelAtPeriodEnd),
      input.canceledAt ?? null,
      input.eventId,
      JSON.stringify({ source: input.eventType, ...(input.metadata ?? {}) }),
    ],
  )

  return { stored: true, linkedUserId: userId }
}

export function verifyStripeSignedPayload(input: SignatureVerificationInput) {
  const tolerance = input.toleranceSeconds ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS
  const parsed = new Map<string, string[]>()

  for (const entry of input.signatureHeader.split(",").map((part) => part.trim())) {
    if (!entry) continue
    const [key, value] = entry.split("=")
    if (!key || !value) continue
    parsed.set(key, [...(parsed.get(key) ?? []), value])
  }

  const timestamp = parsed.get("t")?.[0]
  const signatures = parsed.get("v1") ?? []
  if (!timestamp || !/^\d+$/.test(timestamp)) {
    throw new Error("invalid_signature_timestamp")
  }

  if (!signatures.length) {
    throw new Error("invalid_signature_hash")
  }

  const now = Math.floor(Date.now() / 1000)
  const ageSeconds = Math.abs(now - Number(timestamp))
  if (ageSeconds > tolerance) {
    throw new Error("signature_out_of_tolerance")
  }

  const expectedDigest = createHmac("sha256", input.secret).update(`${timestamp}.${input.payload}`).digest("hex")
  const expectedBuffer = Buffer.from(expectedDigest)

  const valid = signatures.some((signature) => {
    if (!/^[a-fA-F0-9]{16,}$/.test(signature)) return false
    const candidateBuffer = Buffer.from(signature)
    if (candidateBuffer.length !== expectedBuffer.length) return false
    return timingSafeEqual(candidateBuffer, expectedBuffer)
  })

  if (!valid) {
    throw new Error("signature_mismatch")
  }

  return {
    verified: true,
    timestamp: Number(timestamp),
    toleranceSeconds: tolerance,
  }
}

export async function getPaymentAuthLinkageHealth() {
  await ensurePaymentAuthLinkTable()

  const [summary] = await queryMany<{
    total_links: number
    linked_users: number
    unlinked_customers: number
    users_without_customer: number
    stale_links: number
  }>(
    `
      WITH base AS (
        SELECT
          COUNT(*)::int AS total_links,
          COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS linked_users,
          COUNT(*) FILTER (WHERE user_id IS NULL)::int AS unlinked_customers,
          COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '30 day')::int AS stale_links
        FROM payment_auth_customer_links
      ),
      user_gap AS (
        SELECT COUNT(*)::int AS users_without_customer
        FROM users
        WHERE stripe_customer_id IS NULL OR TRIM(stripe_customer_id) = ''
      )
      SELECT
        base.total_links,
        base.linked_users,
        base.unlinked_customers,
        user_gap.users_without_customer,
        base.stale_links
      FROM base, user_gap
    `,
  )

  const staleSample = await queryMany<{
    user_id: string
    payment_customer_id: string
    payment_subscription_id: string | null
    subscription_status: string | null
    updated_at: string
  }>(
    `
      SELECT user_id, payment_customer_id, payment_subscription_id, subscription_status, updated_at::text
      FROM payment_auth_customer_links
      WHERE updated_at < NOW() - INTERVAL '30 day'
      ORDER BY updated_at ASC
      LIMIT 10
    `,
  )

  return {
    summary: {
      totalLinks: summary?.total_links ?? 0,
      linkedUsers: summary?.linked_users ?? 0,
      unlinkedCustomers: summary?.unlinked_customers ?? 0,
      usersWithoutCustomer: summary?.users_without_customer ?? 0,
      staleLinks: summary?.stale_links ?? 0,
    },
    staleSample,
  }
}

export const runashPaymentMappingUtils = {
  toIsoDate,
}

