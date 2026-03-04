import crypto from "crypto"
import { queryMany, queryOne, sql } from "@/lib/db"
import { decryptField, encryptField, rotateEncryptedField } from "@/lib/security/field-encryption"

export type WalletCard = {
  id: string
  userId: string
  holderName: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  billingAddress?: string
  isDefault: boolean
  isBackup: boolean
  isDisabled: boolean
  createdAt: string
}

export type WalletActivity = {
  id: string
  userId: string
  type: "card_added" | "checkout" | "otp_verified" | "subscription_updated"
  description: string
  amount?: number
  currency?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type WalletTransaction = {
  id: string
  userId: string
  amount: number
  currency: string
  status: "succeeded" | "failed"
  description: string
  reconciliationRef: string
  settlementDate: string
  createdAt: string
}

export type WalletSubscription = {
  id: string
  userId: string
  plan: string
  status: "active" | "paused" | "canceled"
  nextBillingDate: string
  amount: number
  currency: string
  timeline: WalletSubscriptionEvent[]
}

export type WalletSubscriptionEvent = {
  id: string
  subscriptionId: string
  userId: string
  eventType: "plan_changed" | "paused" | "canceled" | "reactivated"
  reason?: string
  fromPlan?: string
  toPlan?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type LinkSessionVerificationResult = {
  ok: true
  defaultCard: WalletCard | null
  status: "pending" | "verified" | "failed" | "expired"
  providerRequestId?: string | null
  autofill: {
    email: string
    paymentMethod: string
    billingAddress: string
  } | null
}

const seededUser = "demo-user"
let walletTablesReady = false
let demoBackfillDone = false

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function tokenizePaymentReference() {
  return `tok_${crypto.randomBytes(18).toString("base64url")}`
}

async function ensureWalletTables() {
  if (walletTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS wallet_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      tokenized_payment_reference TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      last4 TEXT NOT NULL,
      exp_month INTEGER NOT NULL,
      exp_year INTEGER NOT NULL,
      billing_address_encrypted TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_backup BOOLEAN NOT NULL DEFAULT FALSE,
      is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS wallet_cards_single_default_idx
      ON wallet_cards (user_id)
      WHERE is_default = TRUE;

    CREATE INDEX IF NOT EXISTS wallet_cards_user_created_idx ON wallet_cards (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wallet_link_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'stripe_link',
      provider_session_id TEXT,
      provider_customer_id TEXT,
      provider_request_id TEXT,
      provider_verification_status TEXT NOT NULL DEFAULT 'pending',
      provider_verification_reason TEXT,
      verification_code_hash TEXT NOT NULL,
      verification_metadata_encrypted TEXT,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_link_sessions_user_created_idx ON wallet_link_sessions (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS wallet_link_sessions_provider_session_idx ON wallet_link_sessions (provider_session_id);

    CREATE TABLE IF NOT EXISTS wallet_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12,2),
      currency TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_activity_logs_user_created_idx ON wallet_activity_logs (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wallet_subscription_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      next_billing_date TIMESTAMPTZ NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_subscription_snapshots_user_idx ON wallet_subscription_snapshots (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS wallet_subscription_events (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reason TEXT,
      from_plan TEXT,
      to_plan TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_subscription_events_sub_idx ON wallet_subscription_events (subscription_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      reconciliation_ref TEXT NOT NULL,
      settlement_date TIMESTAMPTZ NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx ON wallet_transactions (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wallet_otp_verification_attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES wallet_link_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      attempt_code_hash TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      failure_reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_otp_attempts_session_idx ON wallet_otp_verification_attempts (session_id, created_at DESC);
  `)

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe_link';
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider_session_id TEXT;
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider_request_id TEXT;
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider_verification_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE wallet_link_sessions ADD COLUMN IF NOT EXISTS provider_verification_reason TEXT;
    ALTER TABLE wallet_cards ADD COLUMN IF NOT EXISTS is_backup BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE wallet_cards ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE;
  `)

  walletTablesReady = true
}

async function addActivity(userId: string, activity: Omit<WalletActivity, "id" | "userId" | "createdAt">) {
  await ensureWalletTables()
  await queryOne(
    `
      INSERT INTO wallet_activity_logs (id, user_id, activity_type, description, amount, currency, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id
    `,
    [nextId("act"), userId, activity.type, activity.description, activity.amount ?? null, activity.currency ?? null, JSON.stringify(activity.metadata ?? {})],
  )
}

async function runDemoBackfill() {
  if (demoBackfillDone) return
  await ensureWalletTables()

  const existingCard = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE id = $1`, ["card_demo_1"])
  if (!existingCard) {
    await createWalletCard({
      userId: seededUser,
      holderName: "RunAsh User",
      cardNumber: "4242424242424242",
      expMonth: 12,
      expYear: 2028,
      billingAddress: "Bokaro, Jharkhand, India",
      setDefault: true,
      brand: "visa",
      id: "card_demo_1",
    })
  }

  const existingSub = await queryOne<{ id: string }>(`SELECT id FROM wallet_subscription_snapshots WHERE id = $1`, ["sub_demo_1"])
  if (!existingSub) {
    await queryOne(
      `
      INSERT INTO wallet_subscription_snapshots (id, user_id, plan, status, next_billing_date, amount, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
      `,
      ["sub_demo_1", seededUser, "RunAsh Pro", "active", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), 29, "USD"],
    )
  }

  demoBackfillDone = true
}

function mapCardRow(row: any): WalletCard {
  const encryptedAddress = typeof row.billingAddressEncrypted === "string" ? row.billingAddressEncrypted : null
  const parsedAddress = encryptedAddress ? decryptField(encryptedAddress) : null

  return {
    id: row.id,
    userId: row.userId,
    holderName: row.holderName,
    brand: row.brand,
    last4: row.last4,
    expMonth: Number(row.expMonth),
    expYear: Number(row.expYear),
    billingAddress: parsedAddress?.value,
    isDefault: Boolean(row.isDefault),
    isBackup: Boolean(row.isBackup),
    isDisabled: Boolean(row.isDisabled),
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

function mapSubscriptionEventRow(row: any): WalletSubscriptionEvent {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    userId: row.userId,
    eventType: row.eventType,
    reason: row.reason ?? undefined,
    fromPlan: row.fromPlan ?? undefined,
    toPlan: row.toPlan ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export async function listWalletCards(userId: string): Promise<WalletCard[]> {
  await runDemoBackfill()
  const rows = await queryMany<any>(
    `
    SELECT
      id,
      user_id AS "userId",
      holder_name AS "holderName",
      brand,
      last4,
      exp_month AS "expMonth",
      exp_year AS "expYear",
      billing_address_encrypted AS "billingAddressEncrypted",
      is_default AS "isDefault",
      is_backup AS "isBackup",
      is_disabled AS "isDisabled",
      created_at AS "createdAt"
    FROM wallet_cards
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC
  `,
    [userId],
  )

  return rows.map((row) => {
    const card = mapCardRow(row)
    if (row.billingAddressEncrypted && decryptField(row.billingAddressEncrypted).rotated) {
      queryOne(`UPDATE wallet_cards SET billing_address_encrypted = $2, updated_at = NOW() WHERE id = $1`, [row.id, rotateEncryptedField(row.billingAddressEncrypted)]).catch(() => undefined)
    }
    return card
  })
}

export async function createWalletCard(input: {
  userId: string
  holderName: string
  cardNumber: string
  expMonth: number
  expYear: number
  brand?: string
  billingAddress?: string
  setDefault?: boolean
  setBackup?: boolean
  id?: string
}): Promise<WalletCard> {
  await runDemoBackfill()
  const id = input.id ?? nextId("card")
  const last4 = input.cardNumber.replace(/\D/g, "").slice(-4)
  const currentDefault = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE user_id = $1 AND is_default = TRUE LIMIT 1`, [input.userId])
  const shouldSetDefault = Boolean(input.setDefault) || !currentDefault

  if (shouldSetDefault) {
    await queryOne(`UPDATE wallet_cards SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`, [input.userId])
  }

  const row = await queryOne<any>(
    `
      INSERT INTO wallet_cards (
        id,
        user_id,
        holder_name,
        tokenized_payment_reference,
        brand,
        last4,
        exp_month,
        exp_year,
        billing_address_encrypted,
        is_default,
        is_backup,
        is_disabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, FALSE), COALESCE($11, FALSE), FALSE)
      ON CONFLICT (id) DO UPDATE
      SET
        holder_name = EXCLUDED.holder_name,
        brand = EXCLUDED.brand,
        last4 = EXCLUDED.last4,
        exp_month = EXCLUDED.exp_month,
        exp_year = EXCLUDED.exp_year,
        billing_address_encrypted = EXCLUDED.billing_address_encrypted,
        is_default = EXCLUDED.is_default,
        is_backup = EXCLUDED.is_backup,
        updated_at = NOW()
      RETURNING
        id,
        user_id AS "userId",
        holder_name AS "holderName",
        brand,
        last4,
        exp_month AS "expMonth",
        exp_year AS "expYear",
        billing_address_encrypted AS "billingAddressEncrypted",
        is_default AS "isDefault",
        is_backup AS "isBackup",
        is_disabled AS "isDisabled",
        created_at AS "createdAt"
    `,
    [
      id,
      input.userId,
      input.holderName,
      tokenizePaymentReference(),
      input.brand || "card",
      last4,
      input.expMonth,
      input.expYear,
      input.billingAddress ? encryptField(input.billingAddress) : null,
      shouldSetDefault,
      Boolean(input.setBackup),
    ],
  )

  if (!row) throw new Error("Failed to create wallet card")
  await addActivity(input.userId, { type: "card_added", description: `Card •••• ${last4} saved for Link checkout` })
  return mapCardRow(row)
}

export async function setWalletDefaultCard(userId: string, cardId: string): Promise<WalletCard | null> {
  await runDemoBackfill()
  const exists = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE user_id = $1 AND id = $2`, [userId, cardId])
  if (!exists) return null

  await queryOne(`UPDATE wallet_cards SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId])
  const row = await queryOne<any>(
    `
    UPDATE wallet_cards
      SET is_default = TRUE, updated_at = NOW()
    WHERE user_id = $1 AND id = $2
    RETURNING
      id,
      user_id AS "userId",
      holder_name AS "holderName",
      brand,
      last4,
      exp_month AS "expMonth",
      exp_year AS "expYear",
      billing_address_encrypted AS "billingAddressEncrypted",
      is_default AS "isDefault",
      is_backup AS "isBackup",
      is_disabled AS "isDisabled",
      created_at AS "createdAt"
  `,
    [userId, cardId],
  )
  return row ? mapCardRow(row) : null
}

export async function removeWalletCard(userId: string, cardId: string): Promise<WalletCard | null> {
  await runDemoBackfill()
  const removed = await queryOne<any>(
    `
    DELETE FROM wallet_cards
    WHERE user_id = $1 AND id = $2
    RETURNING
      id,
      user_id AS "userId",
      holder_name AS "holderName",
      brand,
      last4,
      exp_month AS "expMonth",
      exp_year AS "expYear",
      billing_address_encrypted AS "billingAddressEncrypted",
      is_default AS "isDefault",
      is_backup AS "isBackup",
      is_disabled AS "isDisabled",
      created_at AS "createdAt"
  `,
    [userId, cardId],
  )

  if (!removed) return null

  const hasDefault = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE user_id = $1 AND is_default = TRUE`, [userId])
  if (!hasDefault) {
    const firstCard = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`, [userId])
    if (firstCard) await queryOne(`UPDATE wallet_cards SET is_default = TRUE, updated_at = NOW() WHERE id = $1`, [firstCard.id])
  }

  await addActivity(userId, { type: "card_added", description: `Card •••• ${removed.last4} removed from wallet` })
  return mapCardRow(removed)
}

export async function updateWalletCardLifecycle(
  userId: string,
  cardId: string,
  input: { setDefault?: boolean; setBackup?: boolean; disable?: boolean },
): Promise<WalletCard | null> {
  await runDemoBackfill()
  const card = await queryOne<{ id: string }>(`SELECT id FROM wallet_cards WHERE user_id = $1 AND id = $2`, [userId, cardId])
  if (!card) return null

  if (input.setDefault) {
    await queryOne(`UPDATE wallet_cards SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId])
  }

  if (input.setBackup) {
    await queryOne(`UPDATE wallet_cards SET is_backup = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId])
  }

  const updated = await queryOne<any>(
    `
      UPDATE wallet_cards
      SET is_default = COALESCE($3, is_default),
          is_backup = COALESCE($4, is_backup),
          is_disabled = COALESCE($5, is_disabled),
          updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING
        id,
        user_id AS "userId",
        holder_name AS "holderName",
        brand,
        last4,
        exp_month AS "expMonth",
        exp_year AS "expYear",
        billing_address_encrypted AS "billingAddressEncrypted",
        is_default AS "isDefault",
        is_backup AS "isBackup",
        is_disabled AS "isDisabled",
        created_at AS "createdAt"
    `,
    [userId, cardId, input.setDefault ?? null, input.setBackup ?? null, input.disable ?? null],
  )

  return updated ? mapCardRow(updated) : null
}

export async function listWalletActivity(userId: string, input?: { limit?: number; offset?: number; search?: string; type?: string }): Promise<WalletActivity[]> {
  await runDemoBackfill()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200)
  const offset = Math.max(input?.offset ?? 0, 0)
  const rows = await queryMany<any>(
    `
    SELECT
      id,
      user_id AS "userId",
      activity_type AS type,
      description,
      amount,
      currency,
      metadata,
      created_at AS "createdAt"
    FROM wallet_activity_logs
    WHERE user_id = $1
      AND ($2::text IS NULL OR activity_type = $2)
      AND ($3::text IS NULL OR description ILIKE '%' || $3 || '%')
    ORDER BY created_at DESC
    LIMIT $4 OFFSET $5
  `,
    [userId, input?.type ?? null, input?.search ?? null, limit, offset],
  )

  return rows.map((row) => ({
    ...row,
    amount: row.amount != null ? Number(row.amount) : undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
  }))
}

export async function listWalletTransactions(userId: string, input?: { limit?: number; offset?: number; status?: "succeeded" | "failed" | null; search?: string }) {
  await runDemoBackfill()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200)
  const offset = Math.max(input?.offset ?? 0, 0)
  const rows = await queryMany<any>(
    `
    SELECT
      id,
      user_id AS "userId",
      amount,
      currency,
      status,
      description,
      reconciliation_ref AS "reconciliationRef",
      settlement_date AS "settlementDate",
      created_at AS "createdAt"
    FROM wallet_transactions
    WHERE user_id = $1
      AND ($2::text IS NULL OR status = $2)
      AND ($3::text IS NULL OR description ILIKE '%' || $3 || '%' OR reconciliation_ref ILIKE '%' || $3 || '%')
    ORDER BY created_at DESC
    LIMIT $4 OFFSET $5
    `,
    [userId, input?.status ?? null, input?.search ?? null, limit, offset],
  )

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    settlementDate: new Date(row.settlementDate).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  })) as WalletTransaction[]
}

export async function listWalletSubscriptions(userId: string, input?: { limit?: number; offset?: number; status?: WalletSubscription["status"] | null; search?: string }): Promise<WalletSubscription[]> {
  await runDemoBackfill()
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200)
  const offset = Math.max(input?.offset ?? 0, 0)
  const rows = await queryMany<any>(
    `
    SELECT
      id,
      user_id AS "userId",
      plan,
      status,
      next_billing_date AS "nextBillingDate",
      amount,
      currency
    FROM wallet_subscription_snapshots
    WHERE user_id = $1
      AND ($2::text IS NULL OR status = $2)
      AND ($3::text IS NULL OR plan ILIKE '%' || $3 || '%')
    ORDER BY updated_at DESC
    LIMIT $4 OFFSET $5
  `,
    [userId, input?.status ?? null, input?.search ?? null, limit, offset],
  )

  const events = await queryMany<any>(
    `
      SELECT
        id,
        subscription_id AS "subscriptionId",
        user_id AS "userId",
        event_type AS "eventType",
        reason,
        from_plan AS "fromPlan",
        to_plan AS "toPlan",
        metadata,
        created_at AS "createdAt"
      FROM wallet_subscription_events
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  )
  const eventsBySub = new Map<string, WalletSubscriptionEvent[]>()
  events.forEach((eventRow) => {
    const event = mapSubscriptionEventRow(eventRow)
    const current = eventsBySub.get(event.subscriptionId) ?? []
    current.push(event)
    eventsBySub.set(event.subscriptionId, current)
  })

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    nextBillingDate: new Date(row.nextBillingDate).toISOString(),
    timeline: eventsBySub.get(row.id) ?? [],
  }))
}

export async function updateWalletSubscriptionStatus(
  userId: string,
  subscriptionId: string,
  input: { status?: WalletSubscription["status"]; plan?: string; reason?: string; eventType: WalletSubscriptionEvent["eventType"] },
) {
  await runDemoBackfill()
  const updated = await queryOne<any>(
    `
    UPDATE wallet_subscription_snapshots
      SET status = COALESCE($3, status),
          plan = COALESCE($4, plan),
          updated_at = NOW()
    WHERE user_id = $1 AND id = $2
    RETURNING id, user_id AS "userId", plan, status, next_billing_date AS "nextBillingDate", amount, currency
  `,
    [userId, subscriptionId, input.status ?? null, input.plan ?? null],
  )

  if (!updated) return null

  await queryOne(
    `
      INSERT INTO wallet_subscription_events (id, subscription_id, user_id, event_type, reason, to_plan)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [nextId("sub_event"), subscriptionId, userId, input.eventType, input.reason ?? null, input.plan ?? updated.plan],
  )

  await addActivity(userId, {
    type: "subscription_updated",
    description: `Subscription ${updated.plan} ${input.eventType.replace("_", " ")}`,
    metadata: { reason: input.reason ?? null, plan: input.plan ?? updated.plan, status: input.status ?? updated.status },
  })

  return {
    ...updated,
    amount: Number(updated.amount),
    nextBillingDate: new Date(updated.nextBillingDate).toISOString(),
  } as WalletSubscription
}

export async function createWalletLinkSession(input: { userId: string; email: string }) {
  await runDemoBackfill()
  const code = `${Math.floor(100000 + Math.random() * 900000)}`
  const session = await queryOne<any>(
    `
    INSERT INTO wallet_link_sessions (id, user_id, email, verification_code_hash, verification_metadata_encrypted)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, user_id AS "userId", created_at AS "createdAt"
  `,
    [
      nextId("link_session"),
      input.userId,
      input.email,
      crypto.createHash("sha256").update(code).digest("hex"),
      encryptField(JSON.stringify({ maskedPhone: "*** *** 3421", emailVerified: false })),
    ],
  )

  if (!session) throw new Error("Failed to create wallet link session")

  return { ...session, verificationCode: undefined as unknown as string, maskedPhone: "*** *** 3421" }
}

export async function createWalletLinkSessionWithProvider(input: {
  userId: string
  email: string
  provider: "stripe_link"
  providerSessionId: string
  providerCustomerId?: string | null
  providerRequestId?: string | null
  maskedPhone: string
}) {
  await runDemoBackfill()
  const session = await queryOne<any>(
    `
    INSERT INTO wallet_link_sessions (
      id,
      user_id,
      email,
      provider,
      provider_session_id,
      provider_customer_id,
      provider_request_id,
      provider_verification_status,
      verification_code_hash,
      verification_metadata_encrypted
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
    RETURNING id, email, user_id AS "userId", created_at AS "createdAt"
  `,
    [
      nextId("link_session"),
      input.userId,
      input.email,
      input.provider,
      input.providerSessionId,
      input.providerCustomerId ?? null,
      input.providerRequestId ?? null,
      crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex"),
      encryptField(JSON.stringify({ maskedPhone: input.maskedPhone, emailVerified: false })),
    ],
  )

  if (!session) throw new Error("Failed to create wallet link session")

  return {
    ...session,
    maskedPhone: input.maskedPhone,
    provider: input.provider,
    providerSessionId: input.providerSessionId,
    providerRequestId: input.providerRequestId ?? null,
  }
}

export async function getWalletLinkSessionById(sessionId: string) {
  await runDemoBackfill()
  return queryOne<any>(
    `
      SELECT
        id,
        user_id AS "userId",
        email,
        provider,
        provider_session_id AS "providerSessionId",
        provider_customer_id AS "providerCustomerId",
        provider_request_id AS "providerRequestId",
        provider_verification_status AS "providerVerificationStatus",
        provider_verification_reason AS "providerVerificationReason",
        verified,
        expires_at AS "expiresAt"
      FROM wallet_link_sessions
      WHERE id = $1
    `,
    [sessionId],
  )
}

export async function updateWalletLinkSessionProviderStatus(input: {
  sessionId?: string
  providerSessionId?: string
  status: "pending" | "verified" | "failed" | "expired"
  reason?: string | null
  providerRequestId?: string | null
}) {
  await runDemoBackfill()
  const session = await queryOne<any>(
    `
      UPDATE wallet_link_sessions
      SET provider_verification_status = $1,
          provider_verification_reason = $2,
          provider_request_id = COALESCE($3, provider_request_id),
          verified = CASE WHEN $1 = 'verified' THEN TRUE ELSE verified END,
          verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE verified_at END,
          updated_at = NOW()
      WHERE ($4::text IS NOT NULL AND id = $4)
         OR ($5::text IS NOT NULL AND provider_session_id = $5)
      RETURNING id, user_id AS "userId", email
    `,
    [input.status, input.reason ?? null, input.providerRequestId ?? null, input.sessionId ?? null, input.providerSessionId ?? null],
  )

  if (session && input.status === "verified") {
    await addActivity(session.userId, { type: "otp_verified", description: `Link account verification completed for ${session.email}` })
  }

  return session
}

export async function verifyWalletLinkSession(sessionId: string, code: string): Promise<{ ok: false; message: string } | LinkSessionVerificationResult> {
  await runDemoBackfill()
  const session = await queryOne<any>(
    `
      SELECT
        id,
        user_id AS "userId",
        email,
        verification_code_hash AS "verificationCodeHash",
        verified,
        verification_metadata_encrypted AS "verificationMetadataEncrypted",
        expires_at AS "expiresAt"
      FROM wallet_link_sessions
      WHERE id = $1
    `,
    [sessionId],
  )

  if (!session) return { ok: false, message: "Session not found" }
  if (new Date(session.expiresAt).getTime() < Date.now()) return { ok: false, message: "Session expired" }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex")
  const success = codeHash === session.verificationCodeHash

  await queryOne(
    `
      INSERT INTO wallet_otp_verification_attempts (id, session_id, user_id, attempt_code_hash, success, failure_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [nextId("otp_attempt"), session.id, session.userId, codeHash, success, success ? null : "invalid_code"],
  )

  if (!success) return { ok: false, message: "Invalid verification code" }

  const metadataPayload = decryptField(session.verificationMetadataEncrypted)
  const metadata = JSON.parse(metadataPayload.value) as { maskedPhone?: string }
  const rotated = metadataPayload.rotated ? rotateEncryptedField(session.verificationMetadataEncrypted) : null

  await queryOne(
    `
    UPDATE wallet_link_sessions
      SET verified = TRUE,
          verified_at = NOW(),
          verification_metadata_encrypted = COALESCE($2, verification_metadata_encrypted),
          updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `,
    [session.id, rotated],
  )

  const cards = await listWalletCards(session.userId)
  const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null
  await addActivity(session.userId, { type: "otp_verified", description: `Link account verification completed for ${session.email}` })

  return {
    ok: true,
    status: "verified",
    providerRequestId: null,
    defaultCard,
    autofill: defaultCard
      ? {
          email: session.email,
          paymentMethod: `${defaultCard.brand.toUpperCase()} •••• ${defaultCard.last4}`,
          billingAddress: defaultCard.billingAddress || "Saved billing address",
        }
      : null,
  }
}

export async function logWalletCheckout(input: { userId: string; amount: number; currency: string; description: string }) {
  await queryOne(
    `
      INSERT INTO wallet_transactions (id, user_id, amount, currency, status, description, reconciliation_ref, settlement_date)
      VALUES ($1, $2, $3, $4, 'succeeded', $5, $6, $7)
      RETURNING id
    `,
    [nextId("txn"), input.userId, input.amount, input.currency, input.description, `REC-${Date.now()}`, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()],
  )

  await addActivity(input.userId, {
    type: "checkout",
    description: input.description,
    amount: input.amount,
    currency: input.currency,
  })
}
