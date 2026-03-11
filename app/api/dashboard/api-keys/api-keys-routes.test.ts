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

function makeRepository(state: PersistentState) {
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
      void input.encryptedSecret
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
      void input.encryptedSecret
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

test("dashboard API key routes persist lifecycle and only expose plaintext on create/rotate", async () => {
  process.env.RUNASH_API_KEY_ENCRYPTION_KEY = "unit-test-key"

  const state: PersistentState = { metadata: [], secrets: [], usage: [], history: [] }
  const store = await import("@/lib/api-platform/api-key-store")
  const keysRoute = await import("./route")
  const keyRoute = await import("./[id]/route")

  store.setApiKeyStoreAdaptersForTests(makeRepository(state))

  try {
    const createRequest = new Request("http://localhost/api/dashboard/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "dashboard-prod", scopes: ["payments:charges.write", "payments:charges.write"] }),
    })
    const createResponse = await keysRoute.POST(createRequest)
    assert.equal(createResponse.status, 201)
    const createdPayload = (await createResponse.json()) as { key: { id: string }; plainTextSecret?: string }
    assert.equal(typeof createdPayload.plainTextSecret, "string")

    const listResponse = await keysRoute.GET()
    assert.equal(listResponse.status, 200)
    const listPayload = (await listResponse.json()) as { keys: Array<Record<string, unknown>> }
    assert.equal(listPayload.keys.length, 1)
    assert.ok(!("plainTextSecret" in listPayload.keys[0]!))

    const rotateRequest = new Request(`http://localhost/api/dashboard/api-keys/${createdPayload.key.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "rotate" }),
    })
    const rotateResponse = await keyRoute.POST(rotateRequest, { params: Promise.resolve({ id: createdPayload.key.id }) })
    assert.equal(rotateResponse.status, 200)
    const rotatePayload = (await rotateResponse.json()) as { key: { id: string }; plainTextSecret?: string }
    assert.equal(typeof rotatePayload.plainTextSecret, "string")

    const revokeRequest = new Request(`http://localhost/api/dashboard/api-keys/${createdPayload.key.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    })
    const revokeResponse = await keyRoute.POST(revokeRequest, { params: Promise.resolve({ id: createdPayload.key.id }) })
    assert.equal(revokeResponse.status, 200)
    const revokePayload = (await revokeResponse.json()) as { key: Record<string, unknown>; plainTextSecret?: string }
    assert.equal(revokePayload.key.status, "revoked")
    assert.equal(revokePayload.plainTextSecret, undefined)
  } finally {
    store.setApiKeyStoreAdaptersForTests(null)
  }
})
