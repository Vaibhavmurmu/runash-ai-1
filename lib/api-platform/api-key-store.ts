import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto"

import { getApiKeyRepository, setApiKeyRepositoryForTests, type ApiKeyRepository } from "@/lib/repositories/api-keys"

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

function getSecretEncryptionKey() {
  const configured = process.env.RUNASH_API_KEY_ENCRYPTION_KEY
  if (!configured) {
    throw new Error("RUNASH_API_KEY_ENCRYPTION_KEY must be configured for API key storage")
  }

  return createHash("sha256").update(configured).digest()
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getSecretEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
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

export function setApiKeyStoreAdaptersForTests(repository: ApiKeyRepository | null) {
  setApiKeyRepositoryForTests(repository)
}

export async function listApiKeys() {
  const rows = await getApiKeyRepository().listKeys()
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

  await getApiKeyRepository().createKeyWithSecret({
    id: key.id,
    name: key.name,
    scopes: key.scopes,
    prefix: key.prefix,
    secretMasked: key.secretMasked,
    secretHash: hashSecret(secret),
    encryptedSecret: encryptSecret(secret),
    createdAt,
  })

  return { key, plainTextSecret: secret }
}

export async function revokeApiKey(id: string) {
  const revoked = await getApiKeyRepository().revokeKeyTransactional(id, nowIso())
  return revoked ? normalizeRow(revoked) : null
}

export async function rotateApiKey(id: string) {
  const secret = createSecret()
  const rotatedAt = nowIso()
  const rotated = await getApiKeyRepository().rotateKeyTransactional({
    id,
    rotatedAt,
    prefix: secret.slice(0, 12),
    secretMasked: maskSecret(secret),
    secretHash: hashSecret(secret),
    encryptedSecret: encryptSecret(secret),
  })

  if (!rotated) return null
  return { key: normalizeRow(rotated), plainTextSecret: secret }
}
