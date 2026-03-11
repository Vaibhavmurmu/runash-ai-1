import assert from "node:assert/strict"
import test from "node:test"

type MetadataRow = {
  id: string
  name: string
  scopes: string[]
  status: "active" | "revoked"
  created_at: string
  rotated_at: string
  last_used_at: string | null
  secret_prefix: string
  secret_masked: string
}

type SecretRow = {
  api_key_id: string
  secret_hash: string
  hash_algorithm: string
  rotated_from_hash: string | null
  created_at: string
}

type UsageRow = {
  api_key_id: string
  bucket_start: string
  request_count: number
}

type RotationRow = {
  api_key_id: string
  action: "created" | "rotated" | "revoked"
  happened_at: string
  prefix_snapshot: string
  secret_masked_snapshot: string
}

type PersistentState = {
  metadata: MetadataRow[]
  secrets: SecretRow[]
  usage: UsageRow[]
  history: RotationRow[]
}

function makeAdapters(state: PersistentState) {
  return {
    async listKeys() {
      return state.metadata
        .map((item) => ({
          ...item,
          usage_24h: state.usage.filter((counter) => counter.api_key_id === item.id).reduce((acc, counter) => acc + counter.request_count, 0),
        }))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    },
    async createKeyWithSecret(input: {
      id: string
      name: string
      scopes: string[]
      prefix: string
      secretMasked: string
      secretHash: string
      encryptedSecret: string
      createdAt: string
    }) {
      state.metadata.push({
        id: input.id,
        name: input.name,
        scopes: input.scopes,
        status: "active",
        created_at: input.createdAt,
        rotated_at: input.createdAt,
        last_used_at: null,
        secret_prefix: input.prefix,
        secret_masked: input.secretMasked,
      })
      state.secrets.push({
        api_key_id: input.id,
        secret_hash: input.secretHash,
        hash_algorithm: "sha256",
        rotated_from_hash: null,
        created_at: input.createdAt,
      })
      state.history.push({
        api_key_id: input.id,
        action: "created",
        happened_at: input.createdAt,
        prefix_snapshot: input.prefix,
        secret_masked_snapshot: input.secretMasked,
      })
      state.usage.push({ api_key_id: input.id, bucket_start: input.createdAt, request_count: 0 })
    },
    async revokeKeyTransactional(id: string, revokedAt: string) {
      const key = state.metadata.find((item) => item.id === id)
      if (!key) return null
      key.status = "revoked"
      key.rotated_at = revokedAt
      state.history.push({
        api_key_id: id,
        action: "revoked",
        happened_at: revokedAt,
        prefix_snapshot: key.secret_prefix,
        secret_masked_snapshot: key.secret_masked,
      })
      return { ...key, usage_24h: 0 }
    },
    async rotateKeyTransactional(input: {
      id: string
      rotatedAt: string
      prefix: string
      secretMasked: string
      secretHash: string
      encryptedSecret: string
    }) {
      const key = state.metadata.find((item) => item.id === input.id)
      if (!key) return null
      const previous = state.secrets.filter((item) => item.api_key_id === input.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
      key.secret_prefix = input.prefix
      key.secret_masked = input.secretMasked
      key.rotated_at = input.rotatedAt
      key.status = "active"
      state.secrets.push({
        api_key_id: input.id,
        secret_hash: input.secretHash,
        hash_algorithm: "sha256",
        rotated_from_hash: previous?.secret_hash ?? null,
        created_at: input.rotatedAt,
      })
      state.history.push({
        api_key_id: input.id,
        action: "rotated",
        happened_at: input.rotatedAt,
        prefix_snapshot: input.prefix,
        secret_masked_snapshot: input.secretMasked,
      })
      return { ...key, usage_24h: 0 }
    },
  }
}

test("api key store persists create/list/revoke/rotate without synthetic defaults", async () => {
  process.env.RUNASH_API_KEY_ENCRYPTION_KEY = "unit-test-key"
  const store = await import("./api-key-store")
  const state: PersistentState = { metadata: [], secrets: [], usage: [], history: [] }

  store.setApiKeyStoreAdaptersForTests(makeAdapters(state))

  try {
    const initial = await store.listApiKeys()
    assert.equal(initial.length, 0)

    const created = await store.createApiKey({ name: "dashboard-prod", scopes: ["payments:charges.write", "payments:charges.write", "webhooks:read"] })
    assert.equal(created.key.name, "dashboard-prod")
    assert.equal(created.key.scopes.length, 2)
    assert.equal(typeof created.plainTextSecret, "string")
    assert.equal(state.secrets.length, 1)

    const listed = await store.listApiKeys()
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.id, created.key.id)

    const rotated = await store.rotateApiKey(created.key.id)
    assert.ok(rotated)
    assert.notEqual(rotated?.plainTextSecret, created.plainTextSecret)
    assert.equal(state.secrets.length, 2)
    assert.equal(state.history.at(-1)?.action, "rotated")

    const revoked = await store.revokeApiKey(created.key.id)
    assert.equal(revoked?.status, "revoked")
    assert.equal(state.history.at(-1)?.action, "revoked")

    const persistedView = await store.listApiKeys()
    assert.equal(persistedView[0]?.status, "revoked")
    assert.ok(!Object.prototype.hasOwnProperty.call(persistedView[0] as object, "plainTextSecret"))
  } finally {
    store.setApiKeyStoreAdaptersForTests(null)
  }
})

test("api key persistence survives module reload (process restart safe)", async () => {
  process.env.RUNASH_API_KEY_ENCRYPTION_KEY = "unit-test-key"
  const first = await import("./api-key-store")
  const state: PersistentState = { metadata: [], secrets: [], usage: [], history: [] }

  first.setApiKeyStoreAdaptersForTests(makeAdapters(state))
  const created = await first.createApiKey({ name: "restart-safe", scopes: ["api:read"] })
  first.setApiKeyStoreAdaptersForTests(null)

  const second = await import(`./api-key-store.ts?restart=${Date.now()}`)
  second.setApiKeyStoreAdaptersForTests(makeAdapters(state))
  try {
    const listed = await second.listApiKeys()
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.id, created.key.id)
  } finally {
    second.setApiKeyStoreAdaptersForTests(null)
  }
})
