import { queryMany, queryOne, sql } from "@/lib/db"

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

export type ApiKeyRepository = {
  listKeys: () => Promise<ApiKeyRow[]>
  createKeyWithSecret: (input: {
    id: string
    name: string
    scopes: string[]
    prefix: string
    secretMasked: string
    secretHash: string
    encryptedSecret: string
    createdAt: string
  }) => Promise<void>
  revokeKeyTransactional: (id: string, revokedAt: string) => Promise<ApiKeyRow | null>
  rotateKeyTransactional: (input: {
    id: string
    rotatedAt: string
    prefix: string
    secretMasked: string
    secretHash: string
    encryptedSecret: string
  }) => Promise<ApiKeyRow | null>
}

const dbRepository: ApiKeyRepository = {
  async listKeys() {
    return queryMany<ApiKeyRow>(
      `
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
      `,
    )
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
          encrypted_secret,
          hash_algorithm,
          encryption_algorithm,
          encryption_key_version,
          created_at
        )
        values (
          ${input.id},
          ${input.secretHash},
          ${input.encryptedSecret},
          'sha256',
          'aes-256-gcm',
          'v1',
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
      const updated = await queryMany<ApiKeyRow>(
        `
        update api_key_metadata
        set status = 'revoked',
            rotated_at = $1::timestamptz
        where id = $2
        returning id, name, scopes, status, created_at, rotated_at, last_used_at, secret_prefix, secret_masked, 0::int as usage_24h
        `,
        [revokedAt, id],
      )
      const key = updated[0] ?? null
      if (!key) {
        await sql`rollback`
        return null
      }

      await queryMany(
        `
        insert into api_key_rotation_history (api_key_id, action, happened_at, prefix_snapshot, secret_masked_snapshot)
        values ($1, 'revoked', $2::timestamptz, $3, $4)
      `,
        [id, revokedAt, key.secret_prefix, key.secret_masked],
      )
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
      const existing = await queryMany<ApiSecretRow>(
        `
        select secret_hash
        from api_key_secret_material
        where api_key_id = $1
        order by created_at desc
        limit 1
      `,
        [input.id],
      )
      const previousHash = existing[0]?.secret_hash ?? null

      const updated = await queryMany<ApiKeyRow>(
        `
        update api_key_metadata
        set rotated_at = $1::timestamptz,
            status = 'active',
            secret_prefix = $2,
            secret_masked = $3
        where id = $4
        returning id, name, scopes, status, created_at, rotated_at, last_used_at, secret_prefix, secret_masked, 0::int as usage_24h
        `,
        [input.rotatedAt, input.prefix, input.secretMasked, input.id],
      )
      const key = updated[0] ?? null
      if (!key) {
        await sql`rollback`
        return null
      }

      await queryMany(
        `
        insert into api_key_secret_material (
          api_key_id,
          secret_hash,
          encrypted_secret,
          hash_algorithm,
          encryption_algorithm,
          encryption_key_version,
          created_at,
          rotated_from_hash
        )
        values ($1, $2, $3, 'sha256', 'aes-256-gcm', 'v1', $4::timestamptz, $5)
      `,
        [input.id, input.secretHash, input.encryptedSecret, input.rotatedAt, previousHash],
      )
      await queryMany(
        `
        insert into api_key_rotation_history (api_key_id, action, happened_at, prefix_snapshot, secret_masked_snapshot)
        values ($1, 'rotated', $2::timestamptz, $3, $4)
      `,
        [input.id, input.rotatedAt, input.prefix, input.secretMasked],
      )
      await sql`commit`
      return key
    } catch (error) {
      await sql`rollback`
      throw error
    }
  },
}

let repositoryOverride: ApiKeyRepository | null = null

export function getApiKeyRepository() {
  return repositoryOverride ?? dbRepository
}

export function setApiKeyRepositoryForTests(repository: ApiKeyRepository | null) {
  repositoryOverride = repository
}
