import { createHash, randomBytes, randomUUID } from "node:crypto"

import { sql } from "@/lib/db"

export type ApiKeyRecord = {
  id: string
  name: string
  scopes: string[]
  status: "active" | "revoked"
  createdAt: string
  rotatedAt: string
  lastUsedAt: string | null
  usage24h: number
  prefix: string
  secretMasked: string
}

type ApiKeyRow = {
  id: string
  name: string
  scopes: string[] | string
  status: "active" | "revoked"
  created_at: string
  rotated_at: string
  last_used_at: string | null
  secret_prefix: string
  secret_masked: string
  usage_24h: number | string | null
}

type ApiSecretRow = {
  secret_hash: string
}

type ApiKeyStoreAdapters = {
  listKeys: () => Promise<ApiKeyRow[]>
  createKeyWithSecret: (input: {
    id: string
    name: string
    scopes: string[]
    prefix: string
    secretMasked: string
    secretHash: string
    createdAt: string
  }) => Promise<void>
  revokeKeyTransactional: (id: string, revokedAt: string) => Promise<ApiKeyRow | null>
  rotateKeyTransactional: (input: {
    id: string
    rotatedAt: string
    prefix: string
    secretMasked: string
    secretHash: string
  }) => Promise<ApiKeyRow | null>
}

let adaptersOverride: ApiKeyStoreAdapters | null = null

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  return randomUUID()
}

function createSecret() {
  return `rk_live_${randomBytes(24).toString("base64url")}`
}

function maskSecret(secret: string) {
  if (secret.length <= 8) return "••••"
  return `${secret.slice(0, 8)}••••${secret.slice(-4)}`
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

function parseScopes(value: ApiKeyRow["scopes"]) {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function normalizeRow(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    scopes: parseScopes(row.scopes),
    status: row.status,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
    lastUsedAt: row.last_used_at,
    usage24h: Number(row.usage_24h ?? 0),
    prefix: row.secret_prefix,
    secretMasked: row.secret_masked,
  }
}

const dbAdapters: ApiKeyStoreAdapters = {
  async listKeys() {
    return sql<ApiKeyRow>`
      select
        m.id,
        m.name,
        m.scopes,
        m.status,
        m.created_at,
        m.rotated_at,
        m.last_used_at,
        m.secret_prefix,
        m.secret_masked,
        coalesce(sum(case when u.bucket_start >= now() - interval '24 hour' then u.request_count else 0 end), 0)::int as usage_24h
      from api_key_metadata m
      left join api_key_usage_counters u on u.api_key_id = m.id
      group by m.id
      order by m.created_at desc
    `
  },
  async createKeyWithSecret(input) {
    await sql`begin`
    try {
      await sql`
        insert into api_key_metadata (
          id,
          name,
          scopes,
          status,
          created_at,
          rotated_at,
          last_used_at,
          secret_prefix,
          secret_masked
        )
        values (
          ${input.id},
          ${input.name},
          ${JSON.stringify(input.scopes)}::jsonb,
          'active',
          ${input.createdAt}::timestamptz,
          ${input.createdAt}::timestamptz,
          null,
          ${input.prefix},
          ${input.secretMasked}
        )
      `
      await sql`
        insert into api_key_secret_material (
          api_key_id,
          secret_hash,
          hash_algorithm,
          created_at
        )
        values (
          ${input.id},
          ${input.secretHash},
          'sha256',
          ${input.createdAt}::timestamptz
        )
      `
      await sql`
        insert into api_key_rotation_history (
          api_key_id,
          action,
          happened_at,
          prefix_snapshot,
          secret_masked_snapshot
        )
        values (
          ${input.id},
          'created',
          ${input.createdAt}::timestamptz,
          ${input.prefix},
          ${input.secretMasked}
        )
      `
      await sql`
        insert into api_key_usage_counters (api_key_id, bucket_start, request_count)
        values (${input.id}, date_trunc('hour', ${input.createdAt}::timestamptz), 0)
        on conflict (api_key_id, bucket_start) do nothing
      `
      await sql`commit`
    } catch (error) {
      await sql`rollback`
      throw error
    }
  },
  async revokeKeyTransactional(id, revokedAt) {
    await sql`begin`
    try {
      const updated = await sql<ApiKeyRow>`
        update api_key_metadata
        set status = 'revoked',
            rotated_at = ${revokedAt}::timestamptz
        where id = ${id}
        returning id, name, scopes, status, created_at, rotated_at, last_used_at, secret_prefix, secret_masked, 0::int as usage_24h
      `
      const key = updated[0] ?? null
      if (!key) {
        await sql`rollback`
        return null
      }

      await sql`
        insert into api_key_rotation_history (api_key_id, action, happened_at, prefix_snapshot, secret_masked_snapshot)
        values (${id}, 'revoked', ${revokedAt}::timestamptz, ${key.secret_prefix}, ${key.secret_masked})
      `
      await sql`commit`
      return key
    } catch (error) {
      await sql`rollback`
      throw error
    }
  },
  async rotateKeyTransactional(input) {
    await sql`begin`
    try {
      const existing = await sql<ApiSecretRow>`
        select secret_hash
        from api_key_secret_material
        where api_key_id = ${input.id}
        order by created_at desc
        limit 1
      `
      const previousHash = existing[0]?.secret_hash ?? null

      const updated = await sql<ApiKeyRow>`
        update api_key_metadata
        set rotated_at = ${input.rotatedAt}::timestamptz,
            status = 'active',
            secret_prefix = ${input.prefix},
            secret_masked = ${input.secretMasked}
        where id = ${input.id}
        returning id, name, scopes, status, created_at, rotated_at, last_used_at, secret_prefix, secret_masked, 0::int as usage_24h
      `
      const key = updated[0] ?? null
      if (!key) {
        await sql`rollback`
        return null
      }

      await sql`
        insert into api_key_secret_material (api_key_id, secret_hash, hash_algorithm, created_at, rotated_from_hash)
        values (${input.id}, ${input.secretHash}, 'sha256', ${input.rotatedAt}::timestamptz, ${previousHash})
      `
      await sql`
        insert into api_key_rotation_history (api_key_id, action, happened_at, prefix_snapshot, secret_masked_snapshot)
        values (${input.id}, 'rotated', ${input.rotatedAt}::timestamptz, ${input.prefix}, ${input.secretMasked})
      `
      await sql`commit`
      return key
    } catch (error) {
      await sql`rollback`
      throw error
    }
  },
}

function getAdapters() {
  return adaptersOverride ?? dbAdapters
}

export function setApiKeyStoreAdaptersForTests(adapters: ApiKeyStoreAdapters | null) {
  adaptersOverride = adapters
}

export async function listApiKeys() {
  const rows = await getAdapters().listKeys()
  return rows.map(normalizeRow)
}

export async function createApiKey(input: { name: string; scopes: string[] }) {
  const secret = createSecret()
  const createdAt = nowIso()

  const key: ApiKeyRecord = {
    id: createId(),
    name: input.name.trim(),
    scopes: [...new Set(input.scopes.map((scope) => scope.trim()).filter(Boolean))],
    status: "active",
    createdAt,
    rotatedAt: createdAt,
    lastUsedAt: null,
    usage24h: 0,
    prefix: secret.slice(0, 12),
    secretMasked: maskSecret(secret),
  }

  await getAdapters().createKeyWithSecret({
    id: key.id,
    name: key.name,
    scopes: key.scopes,
    prefix: key.prefix,
    secretMasked: key.secretMasked,
    secretHash: hashSecret(secret),
    createdAt,
  })

  return { key, plainTextSecret: secret }
}

export async function revokeApiKey(id: string) {
  const revoked = await getAdapters().revokeKeyTransactional(id, nowIso())
  return revoked ? normalizeRow(revoked) : null
}

export async function rotateApiKey(id: string) {
  const secret = createSecret()
  const rotatedAt = nowIso()
  const rotated = await getAdapters().rotateKeyTransactional({
    id,
    rotatedAt,
    prefix: secret.slice(0, 12),
    secretMasked: maskSecret(secret),
    secretHash: hashSecret(secret),
  })

  if (!rotated) return null
  return { key: normalizeRow(rotated), plainTextSecret: secret }
}
