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
  `)

  tablesReady = true
}

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

  await queryOne(
    `
      INSERT INTO checkout_sessions (
        id, checkout_link_id, customer_id, payment_method_ref_id, method_type,
        device_context, browser_context, status
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'authorized')
    `,
    [sessionId, link.id, input.customerId, method?.id ?? null, method?.methodType ?? null, JSON.stringify(input.deviceContext ?? {}), JSON.stringify(input.browserContext ?? {})],
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
