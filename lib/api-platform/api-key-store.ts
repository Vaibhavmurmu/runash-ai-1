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

type ApiKeyStoreState = {
  keys: ApiKeyRecord[]
}

const globalScope = globalThis as typeof globalThis & { __runashApiKeyStore?: ApiKeyStoreState }

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function createSecret() {
  const seed = Math.random().toString(36).slice(2, 20)
  return `rk_live_${seed}`
}

function maskSecret(secret: string) {
  if (secret.length <= 8) return "••••"
  return `${secret.slice(0, 8)}••••${secret.slice(-4)}`
}

function ensureStore() {
  if (!globalScope.__runashApiKeyStore) {
    const seedSecret = createSecret()
    globalScope.__runashApiKeyStore = {
      keys: [
        {
          id: createId(),
          name: "payments-prod-write",
          scopes: ["payments:charges.write", "webhooks:read"],
          status: "active",
          createdAt: nowIso(),
          rotatedAt: nowIso(),
          lastUsedAt: nowIso(),
          usage24h: 2134,
          prefix: seedSecret.slice(0, 12),
          secretMasked: maskSecret(seedSecret),
        },
      ],
    }
  }

  return globalScope.__runashApiKeyStore
}

export function listApiKeys() {
  return ensureStore().keys.map((key) => ({ ...key, scopes: [...key.scopes] }))
}

export function createApiKey(input: { name: string; scopes: string[] }) {
  const secret = createSecret()
  const entry: ApiKeyRecord = {
    id: createId(),
    name: input.name.trim(),
    scopes: [...new Set(input.scopes.map((scope) => scope.trim()).filter(Boolean))],
    status: "active",
    createdAt: nowIso(),
    rotatedAt: nowIso(),
    lastUsedAt: null,
    usage24h: 0,
    prefix: secret.slice(0, 12),
    secretMasked: maskSecret(secret),
  }

  ensureStore().keys.unshift(entry)
  return { key: entry, plainTextSecret: secret }
}

export function revokeApiKey(id: string) {
  const key = ensureStore().keys.find((entry) => entry.id === id)
  if (!key) return null
  key.status = "revoked"
  return { ...key }
}

export function rotateApiKey(id: string) {
  const key = ensureStore().keys.find((entry) => entry.id === id)
  if (!key) return null

  const secret = createSecret()
  key.rotatedAt = nowIso()
  key.secretMasked = maskSecret(secret)
  key.prefix = secret.slice(0, 12)
  key.status = "active"

  return { key: { ...key }, plainTextSecret: secret }
}
