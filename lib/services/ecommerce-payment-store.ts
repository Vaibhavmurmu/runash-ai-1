import { queryMany, queryOne, sql } from "@/lib/db"

export interface EcommercePaymentLink {
  id: string
  name: string
  amount: number
  description: string | null
  link: string
  currency: string
  clicks: number
  conversions: number
  status: "active" | "paused"
  createdAt: string
  updatedAt: string
}

export interface EcommercePaymentMethod {
  id: string
  name: string
  provider: string
  icon: string
  connected: boolean
  createdAt: string
  updatedAt: string
}

let tablesReady = false

async function ensureTables() {
  if (tablesReady) return

  await (sql as any).unsafe(`
    CREATE TABLE IF NOT EXISTS ecommerce_payment_links (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      description TEXT,
      link TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await (sql as any).unsafe(`
    CREATE TABLE IF NOT EXISTS ecommerce_payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      icon TEXT NOT NULL,
      connected BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const methodsCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM ecommerce_payment_methods",
  )

  if ((methodsCount?.count ?? "0") === "0") {
    await (sql as any).unsafe(`
      INSERT INTO ecommerce_payment_methods (id, name, provider, icon, connected)
      VALUES
        ('card', 'Credit/Debit Card', 'Visa, Mastercard, Amex', '💳', true),
        ('stripe', 'Stripe Payment', 'Stripe Connect', '🔗', true),
        ('paypal', 'PayPal', 'PayPal Commerce', '🅿️', true),
        ('crypto', 'Cryptocurrency', 'Bitcoin, Ethereum', '₿', false)
      ON CONFLICT (id) DO NOTHING;
    `)
  }

  tablesReady = true
}

export async function listPaymentLinks(): Promise<EcommercePaymentLink[]> {
  await ensureTables()
  return queryMany<EcommercePaymentLink>(`
    SELECT
      id,
      name,
      amount::float AS amount,
      description,
      link,
      currency,
      clicks,
      conversions,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ecommerce_payment_links
    ORDER BY created_at DESC
  `)
}

export async function getPaymentLinkById(id: string): Promise<EcommercePaymentLink | null> {
  await ensureTables()

  return queryOne<EcommercePaymentLink>(
    `
      SELECT
        id,
        name,
        amount::float AS amount,
        description,
        link,
        currency,
        clicks,
        conversions,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ecommerce_payment_links
      WHERE id = $1
    `,
    [id],
  )
}

export async function createPaymentLink(input: {
  name: string
  amount: number
  description?: string
  currency: string
}): Promise<EcommercePaymentLink> {
  await ensureTables()
  const id = `plink_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "")

  const row = await queryOne<EcommercePaymentLink>(
    `
      INSERT INTO ecommerce_payment_links
      (id, name, amount, description, link, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING
        id,
        name,
        amount::float AS amount,
        description,
        link,
        currency,
        clicks,
        conversions,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [safeId, input.name, input.amount, input.description ?? null, `https://shop.runash.in/pay/${safeId}`, input.currency],
  )

  if (!row) throw new Error("Failed to create payment link")
  return row
}

export async function updatePaymentLink(
  id: string,
  updates: Partial<Pick<EcommercePaymentLink, "name" | "amount" | "description" | "status" | "clicks" | "conversions" | "currency">>,
): Promise<EcommercePaymentLink | null> {
  await ensureTables()
  const row = await queryOne<EcommercePaymentLink>(
    `
      UPDATE ecommerce_payment_links
      SET
        name = COALESCE($2, name),
        amount = COALESCE($3, amount),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        clicks = COALESCE($6, clicks),
        conversions = COALESCE($7, conversions),
        currency = COALESCE($8, currency),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        amount::float AS amount,
        description,
        link,
        currency,
        clicks,
        conversions,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [id, updates.name ?? null, updates.amount ?? null, updates.description ?? null, updates.status ?? null, updates.clicks ?? null, updates.conversions ?? null, updates.currency ?? null],
  )

  return row
}

export async function deletePaymentLink(id: string): Promise<boolean> {
  await ensureTables()
  const row = await queryOne<{ id: string }>(
    `DELETE FROM ecommerce_payment_links WHERE id = $1 RETURNING id`,
    [id],
  )
  return !!row
}

export async function listPaymentMethods(): Promise<EcommercePaymentMethod[]> {
  await ensureTables()
  return queryMany<EcommercePaymentMethod>(`
    SELECT
      id,
      name,
      provider,
      icon,
      connected,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ecommerce_payment_methods
    ORDER BY created_at ASC
  `)
}

export async function createPaymentMethod(input: {
  id: string
  name: string
  provider: string
  icon: string
  connected?: boolean
}): Promise<EcommercePaymentMethod> {
  await ensureTables()
  const row = await queryOne<EcommercePaymentMethod>(
    `
      INSERT INTO ecommerce_payment_methods (id, name, provider, icon, connected)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        provider,
        icon,
        connected,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.id, input.name, input.provider, input.icon, input.connected ?? false],
  )

  if (!row) throw new Error("Failed to create payment method")
  return row
}

export async function updatePaymentMethod(
  id: string,
  updates: Partial<Pick<EcommercePaymentMethod, "name" | "provider" | "icon" | "connected">>,
): Promise<EcommercePaymentMethod | null> {
  await ensureTables()
  const row = await queryOne<EcommercePaymentMethod>(
    `
      UPDATE ecommerce_payment_methods
      SET
        name = COALESCE($2, name),
        provider = COALESCE($3, provider),
        icon = COALESCE($4, icon),
        connected = COALESCE($5, connected),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        provider,
        icon,
        connected,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [id, updates.name ?? null, updates.provider ?? null, updates.icon ?? null, updates.connected ?? null],
  )

  return row
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  await ensureTables()
  const row = await queryOne<{ id: string }>(
    `DELETE FROM ecommerce_payment_methods WHERE id = $1 RETURNING id`,
    [id],
  )
  return !!row
}
