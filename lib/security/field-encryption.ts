import crypto from "crypto"

type CipherEnvelope = {
  kid: string
  iv: string
  tag: string
  data: string
}

type RotationResult = {
  value: string
  rotated: boolean
}

const KEY_DELIMITER = ","
const ENTRY_DELIMITER = ":"

function normalizeKeyMaterial(material: string): Buffer {
  const trimmed = material.trim()
  if (!trimmed) throw new Error("Encryption key material is empty")
  const likelyBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length % 4 === 0
  const keyBuffer = likelyBase64 ? Buffer.from(trimmed, "base64") : Buffer.from(trimmed, "utf8")
  return crypto.createHash("sha256").update(keyBuffer).digest()
}

function parseKeyRing(): Map<string, Buffer> {
  const raw = process.env.RUNASH_FIELD_ENCRYPTION_KEYS?.trim()
  const ring = new Map<string, Buffer>()

  if (raw) {
    for (const entry of raw.split(KEY_DELIMITER)) {
      const [keyId, keyMaterial] = entry.split(ENTRY_DELIMITER)
      if (!keyId || !keyMaterial) continue
      ring.set(keyId.trim(), normalizeKeyMaterial(keyMaterial))
    }
  }

  if (!ring.size) {
    const fallback = process.env.ENCRYPTION_KEY ?? "runash-wallet-dev-fallback-key"
    ring.set("v1", normalizeKeyMaterial(fallback))
  }

  return ring
}

function resolvePrimaryKeyId(keyRing: Map<string, Buffer>): string {
  const explicit = process.env.RUNASH_FIELD_ENCRYPTION_PRIMARY_KEY_ID?.trim()
  if (explicit && keyRing.has(explicit)) return explicit
  return [...keyRing.keys()][0]
}

function parseEnvelope(value: string): CipherEnvelope {
  const parsed = JSON.parse(value) as Partial<CipherEnvelope>
  if (!parsed.kid || !parsed.iv || !parsed.tag || !parsed.data) throw new Error("Invalid encryption envelope")
  return parsed as CipherEnvelope
}

export function encryptField(plaintext: string): string {
  const keyRing = parseKeyRing()
  const primaryKeyId = resolvePrimaryKeyId(keyRing)
  const key = keyRing.get(primaryKeyId)
  if (!key) throw new Error(`Primary encryption key not found: ${primaryKeyId}`)

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return JSON.stringify({
    kid: primaryKeyId,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  } satisfies CipherEnvelope)
}

export function decryptField(ciphertext: string): RotationResult {
  const keyRing = parseKeyRing()
  const primaryKeyId = resolvePrimaryKeyId(keyRing)
  const payload = parseEnvelope(ciphertext)
  const candidateKeyIds = payload.kid && keyRing.has(payload.kid) ? [payload.kid, ...[...keyRing.keys()].filter((id) => id !== payload.kid)] : [...keyRing.keys()]

  for (const keyId of candidateKeyIds) {
    const key = keyRing.get(keyId)
    if (!key) continue

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"))
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"))
      const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8")
      return { value: decrypted, rotated: keyId !== primaryKeyId }
    } catch {
      continue
    }
  }

  throw new Error("Unable to decrypt field with configured key ring")
}

export function rotateEncryptedField(ciphertext: string): string {
  const decrypted = decryptField(ciphertext)
  if (!decrypted.rotated) return ciphertext
  return encryptField(decrypted.value)
}
