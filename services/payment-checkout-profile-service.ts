import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { queryMany, queryOne, sql } from "@/lib/db"

export type CheckoutLinkStatus = "draft" | "active" | "expired" | "disabled"
export type CheckoutSessionStatus = "created" | "authorized" | "completed" | "failed" | "expired"
export type PaymentMethodStatus = "active" | "disabled"

export interface CheckoutLinkRecord {
  id: string
  slug: string
  ownerUserId: string
  amountMin: number | null
  amountMax: number | null
  fixedAmount: number | null
  currency: string
  productMetadata: Record<string, unknown>
  expiresAt: string | null
  status: CheckoutLinkStatus
  createdAt: string
  updatedAt: string
}

export interface CustomerPaymentMethodRefRecord {
  id: string
  customerId: string
  provider: string
  providerTokenId: string
  methodType: string
  last4: string | null
  expiryMonth: number | null
  expiryYear: number | null
  status: PaymentMethodStatus
  createdAt: string
  updatedAt: string
}

export interface CustomerCheckoutProfile {
  customerId: string
  billingAddress: Record<string, unknown> | null
  shippingAddress: Record<string, unknown> | null
  defaultPaymentMethodId: string | null
  backupPaymentMethodId: string | null
  updatedAt: string
}

export interface CheckoutAutofillAuthorization {
  authorized: boolean
  checkoutLink: Pick<CheckoutLinkRecord, "slug" | "currency" | "amountMin" | "amountMax" | "fixedAmount" | "productMetadata">
  profile: CustomerCheckoutProfile
  paymentMethod: Pick<CustomerPaymentMethodRefRecord, "id" | "provider" | "providerTokenId" | "methodType" | "last4" | "expiryMonth" | "expiryYear"> | null
  checkoutSessionId: string
}

export interface PortalLifecycleActionRecord {
  id: string
  customerId: string
  actionType: "update_method" | "retry_failed_payment" | "subscription_state_change"
  status: "queued" | "completed" | "failed"
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PortalMetricsSnapshot {
  totalPayments: number
  failedPayments: number
  recoveredPayments: number
  renewalAtRisk: number
  renewalHealthy: number
}

export interface CheckoutAttemptResultRecord {
  id: string
  checkoutSessionId: string
  customerId: string
  paymentMethodRefId: string | null
  attemptStatus: "authorized" | "completed" | "failed" | "expired"
  attemptResultCode: string | null
  attemptResultMessage: string | null
  metadata: Record<string, unknown>
  occurredAt: string
  createdAt: string
}

export interface CheckoutAnalyticsSnapshot {
  totalAttempts: number
  completedAttempts: number
  failedAttempts: number
  authorizedAttempts: number
  expiredAttempts: number
  successRatePercent: number
  avgAttemptsPerSession: number
  lastAttemptAt: string | null
}

let tablesReady = false

function getEncryptionKey() {
  const input =
    process.env.CHECKOUT_PROFILE_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "runash-local-dev-key"

  return createHash("sha256").update(input).digest()
}

function encryptJson(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const serialized = JSON.stringify(payload)
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`
}

function decryptJson(payload: string | null): Record<string, unknown> | null {
  if (!payload) return null
  const [ivB64, tagB64, encryptedB64] = payload.split(":")
  if (!ivB64 || !tagB64 || !encryptedB64) return null

  const key = getEncryptionKey()
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedB64, "base64")), decipher.final()]).toString("utf8")
  const parsed = JSON.parse(decrypted)
  return typeof parsed === "object" && parsed !== null ? parsed : null
}

async function ensureTables() {
  if (tablesReady) return

  await (sql as any).unsafe(`
    CREATE TABLE IF NOT EXISTS checkout_links (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      owner_user_id TEXT NOT NULL,
      amount_min NUMERIC(15,2),
      amount_max NUMERIC(15,2),
      fixed_amount NUMERIC(15,2),
      currency TEXT NOT NULL DEFAULT 'USD',
      product_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT checkout_links_amount_rule_chk CHECK (
        (fixed_amount IS NOT NULL AND amount_min IS NULL AND amount_max IS NULL)
        OR
        (fixed_amount IS NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_checkout_links_owner_status ON checkout_links(owner_user_id, status);

    CREATE TABLE IF NOT EXISTS customer_payment_method_vault_refs (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_token_id TEXT NOT NULL,
      method_type TEXT NOT NULL,
      last4 TEXT,
      expiry_month INTEGER,
      expiry_year INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_provider_token_per_customer UNIQUE(customer_id, provider, provider_token_id)
    );

    CREATE INDEX IF NOT EXISTS idx_payment_method_vault_customer ON customer_payment_method_vault_refs(customer_id, status);

    CREATE TABLE IF NOT EXISTS customer_checkout_profiles (
      customer_id TEXT PRIMARY KEY,
      billing_address_encrypted TEXT,
      shipping_address_encrypted TEXT,
      default_payment_method_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
      backup_payment_method_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id TEXT PRIMARY KEY,
      checkout_link_id TEXT NOT NULL REFERENCES checkout_links(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL,
      payment_method_ref_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
      method_type TEXT,
      device_context JSONB NOT NULL DEFAULT '{}'::jsonb,
      browser_context JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_checkout_sessions_customer_created ON checkout_sessions(customer_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS checkout_attempt_results (
      id TEXT PRIMARY KEY,
      checkout_session_id TEXT NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL,
      payment_method_ref_id TEXT REFERENCES customer_payment_method_vault_refs(id) ON DELETE SET NULL,
      attempt_status TEXT NOT NULL,
      attempt_result_code TEXT,
      attempt_result_message TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_checkout_attempt_results_customer_created
      ON checkout_attempt_results(customer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_checkout_attempt_results_session_status
      ON checkout_attempt_results(checkout_session_id, attempt_status);

    CREATE TABLE IF NOT EXISTS portal_lifecycle_actions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_portal_lifecycle_actions_customer_created
      ON portal_lifecycle_actions(customer_id, created_at DESC);
  `)

  tablesReady = true
}

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildSessionIntegrityFingerprint(input: { deviceContext?: Record<string, unknown>; browserContext?: Record<string, unknown> }) {
  const raw = JSON.stringify({
    d: input.deviceContext ?? {},
    b: input.browserContext ?? {},
  })
  return createHash("sha256").update(raw).digest("hex")
}

function mapCheckoutLink(row: any): CheckoutLinkRecord {
  return {
    id: row.id,
    slug: row.slug,
    ownerUserId: row.ownerUserId,
    amountMin: row.amountMin == null ? null : Number(row.amountMin),
    amountMax: row.amountMax == null ? null : Number(row.amountMax),
    fixedAmount: row.fixedAmount == null ? null : Number(row.fixedAmount),
    currency: row.currency,
    productMetadata: row.productMetadata ?? {},
    expiresAt: row.expiresAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapMethodRef(row: any): CustomerPaymentMethodRefRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    provider: row.provider,
    providerTokenId: row.providerTokenId,
    methodType: row.methodType,
    last4: row.last4,
    expiryMonth: row.expiryMonth,
    expiryYear: row.expiryYear,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function getProfileRow(customerId: string) {
  await ensureTables()
  return queryOne<{
    customerId: string
    billingAddressEncrypted: string | null
    shippingAddressEncrypted: string | null
    defaultPaymentMethodId: string | null
    backupPaymentMethodId: string | null
    updatedAt: string
  }>(
    `
      SELECT
        customer_id AS "customerId",
        billing_address_encrypted AS "billingAddressEncrypted",
        shipping_address_encrypted AS "shippingAddressEncrypted",
        default_payment_method_id AS "defaultPaymentMethodId",
        backup_payment_method_id AS "backupPaymentMethodId",
        updated_at AS "updatedAt"
      FROM customer_checkout_profiles
      WHERE customer_id = $1
    `,
    [customerId],
  )
}

function assertNoRawPan(body: Record<string, unknown>) {
  const disallowedKeys = ["pan", "cardNumber", "cvv", "securityCode", "fullCardNumber", "rawPan"]
  for (const key of disallowedKeys) {
    if (key in body) {
      throw new Error("Raw card data is not allowed. Store provider tokenized references only.")
    }
  }
}

export async function createCheckoutLink(input: {
  ownerUserId: string
  slug: string
  amountMin?: number | null
  amountMax?: number | null
  fixedAmount?: number | null
  currency: string
  productMetadata?: Record<string, unknown>
  expiresAt?: string | null
  status?: CheckoutLinkStatus
}) {
  await ensureTables()
  const row = await queryOne<any>(
    `
      INSERT INTO checkout_links (
        id, slug, owner_user_id, amount_min, amount_max, fixed_amount,
        currency, product_metadata, expires_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
      RETURNING
        id,
        slug,
        owner_user_id AS "ownerUserId",
        amount_min::float8 AS "amountMin",
        amount_max::float8 AS "amountMax",
        fixed_amount::float8 AS "fixedAmount",
        currency,
        product_metadata AS "productMetadata",
        expires_at AS "expiresAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      nowId("chk_link"),
      input.slug,
      input.ownerUserId,
      input.amountMin ?? null,
      input.amountMax ?? null,
      input.fixedAmount ?? null,
      input.currency,
      JSON.stringify(input.productMetadata ?? {}),
      input.expiresAt ?? null,
      input.status ?? "draft",
    ],
  )

  if (!row) throw new Error("Failed to create checkout link")
  return mapCheckoutLink(row)
}

export async function listCheckoutLinks(ownerUserId: string): Promise<CheckoutLinkRecord[]> {
  await ensureTables()

  const rows = await queryMany<any>(
    `
      SELECT
        id,
        slug,
        owner_user_id AS "ownerUserId",
        amount_min::float8 AS "amountMin",
        amount_max::float8 AS "amountMax",
        fixed_amount::float8 AS "fixedAmount",
        currency,
        product_metadata AS "productMetadata",
        expires_at AS "expiresAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM checkout_links
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
    `,
    [ownerUserId],
  )

  return rows.map(mapCheckoutLink)
}

export async function updateCheckoutLink(input: {
  ownerUserId: string
  id: string
  amountMin?: number | null
  amountMax?: number | null
  fixedAmount?: number | null
  currency?: string
  productMetadata?: Record<string, unknown>
  expiresAt?: string | null
  status?: CheckoutLinkStatus
}) {
  await ensureTables()

  const row = await queryOne<any>(
    `
      UPDATE checkout_links
      SET
        amount_min = COALESCE($3, amount_min),
        amount_max = COALESCE($4, amount_max),
        fixed_amount = COALESCE($5, fixed_amount),
        currency = COALESCE($6, currency),
        product_metadata = COALESCE($7::jsonb, product_metadata),
        expires_at = COALESCE($8, expires_at),
        status = COALESCE($9, status),
        updated_at = NOW()
      WHERE id = $1 AND owner_user_id = $2
      RETURNING
        id,
        slug,
        owner_user_id AS "ownerUserId",
        amount_min::float8 AS "amountMin",
        amount_max::float8 AS "amountMax",
        fixed_amount::float8 AS "fixedAmount",
        currency,
        product_metadata AS "productMetadata",
        expires_at AS "expiresAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.ownerUserId,
      input.amountMin,
      input.amountMax,
      input.fixedAmount,
      input.currency,
      input.productMetadata ? JSON.stringify(input.productMetadata) : null,
      input.expiresAt,
      input.status,
    ],
  )

  return row ? mapCheckoutLink(row) : null
}

export async function transitionCheckoutLinkStatus(input: {
  ownerUserId: string
  id: string
  action: "disable" | "expire"
}) {
  const nextStatus: CheckoutLinkStatus = input.action === "disable" ? "disabled" : "expired"
  const expiresAt = input.action === "expire" ? new Date().toISOString() : undefined
  return updateCheckoutLink({ ownerUserId: input.ownerUserId, id: input.id, status: nextStatus, expiresAt })
}

export async function addCustomerPaymentMethodReference(input: {
  customerId: string
  provider: string
  providerTokenId: string
  methodType: string
  last4?: string | null
  expiryMonth?: number | null
  expiryYear?: number | null
  setAsDefault?: boolean
  setAsBackup?: boolean
  payload?: Record<string, unknown>
}) {
  await ensureTables()
  assertNoRawPan(input.payload ?? {})

  const method = await queryOne<any>(
    `
      INSERT INTO customer_payment_method_vault_refs (
        id, customer_id, provider, provider_token_id, method_type, last4, expiry_month, expiry_year, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING
        id,
        customer_id AS "customerId",
        provider,
        provider_token_id AS "providerTokenId",
        method_type AS "methodType",
        last4,
        expiry_month AS "expiryMonth",
        expiry_year AS "expiryYear",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      nowId("pmref"),
      input.customerId,
      input.provider,
      input.providerTokenId,
      input.methodType,
      input.last4 ?? null,
      input.expiryMonth ?? null,
      input.expiryYear ?? null,
    ],
  )

  if (!method) throw new Error("Failed to add payment method reference")

  await queryOne(
    `
      INSERT INTO customer_checkout_profiles (customer_id, default_payment_method_id, backup_payment_method_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (customer_id)
      DO UPDATE SET
        default_payment_method_id = CASE WHEN $4::boolean THEN EXCLUDED.default_payment_method_id ELSE customer_checkout_profiles.default_payment_method_id END,
        backup_payment_method_id = CASE WHEN $5::boolean THEN EXCLUDED.backup_payment_method_id ELSE customer_checkout_profiles.backup_payment_method_id END,
        updated_at = NOW()
    `,
    [input.customerId, method.id, method.id, Boolean(input.setAsDefault), Boolean(input.setAsBackup)],
  )

  return mapMethodRef(method)
}

export async function getCustomerCheckoutProfile(customerId: string): Promise<CustomerCheckoutProfile> {
  await ensureTables()
  const row = await getProfileRow(customerId)

  if (!row) {
    return {
      customerId,
      billingAddress: null,
      shippingAddress: null,
      defaultPaymentMethodId: null,
      backupPaymentMethodId: null,
      updatedAt: new Date(0).toISOString(),
    }
  }

  return {
    customerId: row.customerId,
    billingAddress: decryptJson(row.billingAddressEncrypted),
    shippingAddress: decryptJson(row.shippingAddressEncrypted),
    defaultPaymentMethodId: row.defaultPaymentMethodId,
    backupPaymentMethodId: row.backupPaymentMethodId,
    updatedAt: row.updatedAt,
  }
}

export async function upsertCustomerCheckoutProfile(input: {
  customerId: string
  billingAddress?: Record<string, unknown> | null
  shippingAddress?: Record<string, unknown> | null
  defaultPaymentMethodId?: string | null
  backupPaymentMethodId?: string | null
}) {
  await ensureTables()
  const billingEncrypted = encryptJson(input.billingAddress)
  const shippingEncrypted = encryptJson(input.shippingAddress)

  await queryOne(
    `
      INSERT INTO customer_checkout_profiles (
        customer_id, billing_address_encrypted, shipping_address_encrypted,
        default_payment_method_id, backup_payment_method_id
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (customer_id)
      DO UPDATE SET
        billing_address_encrypted = COALESCE($2, customer_checkout_profiles.billing_address_encrypted),
        shipping_address_encrypted = COALESCE($3, customer_checkout_profiles.shipping_address_encrypted),
        default_payment_method_id = COALESCE($4, customer_checkout_profiles.default_payment_method_id),
        backup_payment_method_id = COALESCE($5, customer_checkout_profiles.backup_payment_method_id),
        updated_at = NOW()
    `,
    [input.customerId, billingEncrypted, shippingEncrypted, input.defaultPaymentMethodId ?? null, input.backupPaymentMethodId ?? null],
  )

  return getCustomerCheckoutProfile(input.customerId)
}

export async function listCustomerPaymentMethodReferences(customerId: string): Promise<CustomerPaymentMethodRefRecord[]> {
  await ensureTables()
  const rows = await queryMany<any>(
    `
      SELECT
        id,
        customer_id AS "customerId",
        provider,
        provider_token_id AS "providerTokenId",
        method_type AS "methodType",
        last4,
        expiry_month AS "expiryMonth",
        expiry_year AS "expiryYear",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM customer_payment_method_vault_refs
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `,
    [customerId],
  )

  return rows.map(mapMethodRef)
}

export async function switchCustomerPaymentMethod(input: {
  customerId: string
  paymentMethodRefId: string
  role: "default" | "backup"
}) {
  await ensureTables()

  const exists = await queryOne<{ id: string }>(
    `
      SELECT id
      FROM customer_payment_method_vault_refs
      WHERE id = $1 AND customer_id = $2 AND status = 'active'
    `,
    [input.paymentMethodRefId, input.customerId],
  )

  if (!exists) return null

  if (input.role === "default") {
    await queryOne(
      `
        INSERT INTO customer_checkout_profiles (customer_id, default_payment_method_id)
        VALUES ($1, $2)
        ON CONFLICT (customer_id)
        DO UPDATE SET default_payment_method_id = EXCLUDED.default_payment_method_id, updated_at = NOW()
      `,
      [input.customerId, input.paymentMethodRefId],
    )
  } else {
    await queryOne(
      `
        INSERT INTO customer_checkout_profiles (customer_id, backup_payment_method_id)
        VALUES ($1, $2)
        ON CONFLICT (customer_id)
        DO UPDATE SET backup_payment_method_id = EXCLUDED.backup_payment_method_id, updated_at = NOW()
      `,
      [input.customerId, input.paymentMethodRefId],
    )
  }

  return getCustomerCheckoutProfile(input.customerId)
}

export async function updateCustomerPaymentMethodRole(input: {
  customerId: string
  role: "default" | "backup"
  paymentMethodRefId: string
}) {
  return switchCustomerPaymentMethod({ customerId: input.customerId, role: input.role, paymentMethodRefId: input.paymentMethodRefId })
}

export async function removeCustomerPaymentMethodReference(input: { customerId: string; paymentMethodRefId: string }) {
  await ensureTables()

  const removed = await queryOne<{ id: string }>(
    `
      DELETE FROM customer_payment_method_vault_refs
      WHERE id = $1 AND customer_id = $2
      RETURNING id
    `,
    [input.paymentMethodRefId, input.customerId],
  )

  if (!removed) return false

  await queryOne(
    `
      UPDATE customer_checkout_profiles
      SET
        default_payment_method_id = CASE WHEN default_payment_method_id = $2 THEN NULL ELSE default_payment_method_id END,
        backup_payment_method_id = CASE WHEN backup_payment_method_id = $2 THEN NULL ELSE backup_payment_method_id END,
        updated_at = NOW()
      WHERE customer_id = $1
    `,
    [input.customerId, input.paymentMethodRefId],
  )

  return true
}

export async function authorizeCheckoutAutofill(input: {
  customerId: string
  linkSlug: string
  preferBackupMethod?: boolean
  deviceContext?: Record<string, unknown>
  browserContext?: Record<string, unknown>
}) {
  await ensureTables()

  const link = await queryOne<any>(
    `
      SELECT
        id,
        slug,
        owner_user_id AS "ownerUserId",
        amount_min::float8 AS "amountMin",
        amount_max::float8 AS "amountMax",
        fixed_amount::float8 AS "fixedAmount",
        currency,
        product_metadata AS "productMetadata",
        expires_at AS "expiresAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM checkout_links
      WHERE slug = $1
    `,
    [input.linkSlug],
  )

  if (!link) return null
  if (link.status !== "active") return null
  if (link.expiresAt && Date.parse(link.expiresAt) < Date.now()) return null

  const profile = await getCustomerCheckoutProfile(input.customerId)
  const selectedMethodId = input.preferBackupMethod ? profile.backupPaymentMethodId : profile.defaultPaymentMethodId

  const method =
    selectedMethodId == null
      ? null
      : await queryOne<any>(
          `
            SELECT
              id,
              customer_id AS "customerId",
              provider,
              provider_token_id AS "providerTokenId",
              method_type AS "methodType",
              last4,
              expiry_month AS "expiryMonth",
              expiry_year AS "expiryYear",
              status,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
            FROM customer_payment_method_vault_refs
            WHERE id = $1 AND customer_id = $2 AND status = 'active'
          `,
          [selectedMethodId, input.customerId],
        )

  const sessionId = nowId("chk_sess")
  const sessionIntegrityHash = buildSessionIntegrityFingerprint({
    deviceContext: input.deviceContext,
    browserContext: input.browserContext,
  })

  await queryOne(
    `
      INSERT INTO checkout_sessions (
        id, checkout_link_id, customer_id, payment_method_ref_id, method_type,
        device_context, browser_context, status
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'authorized')
    `,
    [
      sessionId,
      link.id,
      input.customerId,
      method?.id ?? null,
      method?.methodType ?? null,
      JSON.stringify({ ...(input.deviceContext ?? {}), sessionIntegrityHash }),
      JSON.stringify(input.browserContext ?? {}),
    ],
  )

  const result: CheckoutAutofillAuthorization = {
    authorized: true,
    checkoutLink: {
      slug: link.slug,
      currency: link.currency,
      amountMin: link.amountMin,
      amountMax: link.amountMax,
      fixedAmount: link.fixedAmount,
      productMetadata: link.productMetadata ?? {},
    },
    profile,
    paymentMethod: method ? mapMethodRef(method) : null,
    checkoutSessionId: sessionId,
  }

  return result
}


export async function verifyPaymentMethodSessionIntegrity(input: {
  customerId: string
  deviceContext?: Record<string, unknown>
  browserContext?: Record<string, unknown>
}) {
  await ensureTables()

  const latestAuthorizedSession = await queryOne<{ deviceContext: Record<string, unknown> }>(
    `
      SELECT device_context AS "deviceContext"
      FROM checkout_sessions
      WHERE customer_id = $1
        AND status = 'authorized'
        AND payment_method_ref_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [input.customerId],
  )

  if (!latestAuthorizedSession) {
    return { ok: true }
  }

  const expectedHash =
    latestAuthorizedSession.deviceContext && typeof latestAuthorizedSession.deviceContext.sessionIntegrityHash === "string"
      ? String(latestAuthorizedSession.deviceContext.sessionIntegrityHash)
      : null

  if (!expectedHash) {
    return { ok: false }
  }

  const currentHash = buildSessionIntegrityFingerprint({
    deviceContext: input.deviceContext,
    browserContext: input.browserContext,
  })

  return { ok: currentHash === expectedHash }
}

function mapLifecycleAction(row: any): PortalLifecycleActionRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    actionType: row.actionType,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapCheckoutAttemptResult(row: any): CheckoutAttemptResultRecord {
  return {
    id: row.id,
    checkoutSessionId: row.checkoutSessionId,
    customerId: row.customerId,
    paymentMethodRefId: row.paymentMethodRefId,
    attemptStatus: row.attemptStatus,
    attemptResultCode: row.attemptResultCode,
    attemptResultMessage: row.attemptResultMessage,
    metadata: row.metadata ?? {},
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  }
}

export async function recordCheckoutAttemptResult(input: {
  checkoutSessionId: string
  customerId: string
  paymentMethodRefId?: string | null
  attemptStatus: CheckoutAttemptResultRecord["attemptStatus"]
  attemptResultCode?: string | null
  attemptResultMessage?: string | null
  metadata?: Record<string, unknown>
  occurredAt?: string
}) {
  await ensureTables()

  const row = await queryOne<any>(
    `
      INSERT INTO checkout_attempt_results (
        id,
        checkout_session_id,
        customer_id,
        payment_method_ref_id,
        attempt_status,
        attempt_result_code,
        attempt_result_message,
        metadata,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9::timestamptz, NOW()))
      RETURNING
        id,
        checkout_session_id AS "checkoutSessionId",
        customer_id AS "customerId",
        payment_method_ref_id AS "paymentMethodRefId",
        attempt_status AS "attemptStatus",
        attempt_result_code AS "attemptResultCode",
        attempt_result_message AS "attemptResultMessage",
        metadata,
        occurred_at AS "occurredAt",
        created_at AS "createdAt"
    `,
    [
      nowId("chk_attempt"),
      input.checkoutSessionId,
      input.customerId,
      input.paymentMethodRefId ?? null,
      input.attemptStatus,
      input.attemptResultCode ?? null,
      input.attemptResultMessage ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.occurredAt ?? null,
    ],
  )

  if (!row) throw new Error("Failed to persist checkout attempt result")
  return mapCheckoutAttemptResult(row)
}

export async function listCheckoutAttemptResults(customerId: string, limit = 100): Promise<CheckoutAttemptResultRecord[]> {
  await ensureTables()
  const rows = await queryMany<any>(
    `
      SELECT
        id,
        checkout_session_id AS "checkoutSessionId",
        customer_id AS "customerId",
        payment_method_ref_id AS "paymentMethodRefId",
        attempt_status AS "attemptStatus",
        attempt_result_code AS "attemptResultCode",
        attempt_result_message AS "attemptResultMessage",
        metadata,
        occurred_at AS "occurredAt",
        created_at AS "createdAt"
      FROM checkout_attempt_results
      WHERE customer_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2
    `,
    [customerId, Math.max(1, Math.min(500, limit))],
  )

  return rows.map(mapCheckoutAttemptResult)
}

export async function getCheckoutAnalyticsSnapshot(customerId: string): Promise<CheckoutAnalyticsSnapshot> {
  await ensureTables()
  const [attemptsRow] = await queryMany<{
    totalAttempts: number
    completedAttempts: number
    failedAttempts: number
    authorizedAttempts: number
    expiredAttempts: number
    avgAttemptsPerSession: number
    lastAttemptAt: string | null
  }>(
    `
      SELECT
        COUNT(*)::int AS "totalAttempts",
        COUNT(*) FILTER (WHERE attempt_status = 'completed')::int AS "completedAttempts",
        COUNT(*) FILTER (WHERE attempt_status = 'failed')::int AS "failedAttempts",
        COUNT(*) FILTER (WHERE attempt_status = 'authorized')::int AS "authorizedAttempts",
        COUNT(*) FILTER (WHERE attempt_status = 'expired')::int AS "expiredAttempts",
        COALESCE(COUNT(*)::float8 / NULLIF(COUNT(DISTINCT checkout_session_id), 0), 0)::float8 AS "avgAttemptsPerSession",
        MAX(occurred_at)::text AS "lastAttemptAt"
      FROM checkout_attempt_results
      WHERE customer_id = $1
    `,
    [customerId],
  )

  const totalAttempts = Number(attemptsRow?.totalAttempts ?? 0)
  const completedAttempts = Number(attemptsRow?.completedAttempts ?? 0)

  return {
    totalAttempts,
    completedAttempts,
    failedAttempts: Number(attemptsRow?.failedAttempts ?? 0),
    authorizedAttempts: Number(attemptsRow?.authorizedAttempts ?? 0),
    expiredAttempts: Number(attemptsRow?.expiredAttempts ?? 0),
    successRatePercent: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
    avgAttemptsPerSession: Number(attemptsRow?.avgAttemptsPerSession ?? 0),
    lastAttemptAt: attemptsRow?.lastAttemptAt ?? null,
  }
}

export async function createPortalLifecycleAction(input: {
  customerId: string
  actionType: PortalLifecycleActionRecord["actionType"]
  metadata?: Record<string, unknown>
}) {
  await ensureTables()

  const row = await queryOne<any>(
    `
      INSERT INTO portal_lifecycle_actions (id, customer_id, action_type, status, metadata)
      VALUES ($1, $2, $3, 'completed', $4::jsonb)
      RETURNING
        id,
        customer_id AS "customerId",
        action_type AS "actionType",
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [nowId("portal_action"), input.customerId, input.actionType, JSON.stringify(input.metadata ?? {})],
  )

  if (!row) throw new Error("Failed to persist portal lifecycle action")
  return mapLifecycleAction(row)
}

export async function listPortalLifecycleActions(customerId: string): Promise<PortalLifecycleActionRecord[]> {
  await ensureTables()
  const rows = await queryMany<any>(
    `
      SELECT
        id,
        customer_id AS "customerId",
        action_type AS "actionType",
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM portal_lifecycle_actions
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [customerId],
  )

  return rows.map(mapLifecycleAction)
}

export async function getPortalMetricsSnapshot(customerId: string): Promise<PortalMetricsSnapshot> {
  await ensureTables()

  const [paymentRow] = await queryMany<{
    totalPayments: number
    failedPayments: number
    recoveredPayments: number
  }>(
    `
      SELECT
        COUNT(*)::int AS "totalPayments",
        COUNT(*) FILTER (WHERE status = 'failed')::int AS "failedPayments",
        COUNT(*) FILTER (WHERE status IN ('completed', 'authorized'))::int AS "recoveredPayments"
      FROM checkout_sessions
      WHERE customer_id = $1
    `,
    [customerId],
  )

  const [renewalRow] = await queryMany<{
    renewalAtRisk: number
    renewalHealthy: number
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('past_due', 'unpaid', 'canceled'))::int AS "renewalAtRisk",
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing'))::int AS "renewalHealthy"
      FROM user_subscriptions
      WHERE user_id = $1
    `,
    [customerId],
  )

  return {
    totalPayments: Number(paymentRow?.totalPayments ?? 0),
    failedPayments: Number(paymentRow?.failedPayments ?? 0),
    recoveredPayments: Number(paymentRow?.recoveredPayments ?? 0),
    renewalAtRisk: Number(renewalRow?.renewalAtRisk ?? 0),
    renewalHealthy: Number(renewalRow?.renewalHealthy ?? 0),
  }
}
