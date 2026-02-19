import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function normalizeHex(hex: string) {
  return hex.startsWith("0x") ? hex.slice(2).toLowerCase() : hex.toLowerCase()
}

export async function issueSiweNonce(domain: string, chainId?: number) {
  const nonce = randomBytes(16).toString("base64url")
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await sql`
    INSERT INTO siwe_nonces (nonce, domain, chain_id, expires_at)
    VALUES (${nonce}, ${domain}, ${chainId ?? null}, ${expiresAt})
  `

  return { nonce, expiresAt }
}

function computeMessageDigest(message: string) {
  return createHash("sha256").update(message).digest("hex")
}

function verifyDigestSignature(expectedDigestHex: string, signature: string) {
  const cleanExpected = normalizeHex(expectedDigestHex)
  const cleanSig = normalizeHex(signature)
  const expectedBuffer = Buffer.from(cleanExpected, "hex")
  const sigBuffer = Buffer.from(cleanSig, "hex")

  if (expectedBuffer.length !== sigBuffer.length || expectedBuffer.length === 0) {
    return false
  }

  return timingSafeEqual(expectedBuffer, sigBuffer)
}

export async function verifySiweLogin(input: {
  nonce: string
  message: string
  signature: string
  walletAddress: string
  chainId?: number
  userId?: number
}) {
  const nonceRows = await sql`
    SELECT * FROM siwe_nonces
    WHERE nonce = ${input.nonce}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `

  const nonceRecord = nonceRows[0]
  if (!nonceRecord) {
    return { ok: false as const, reason: "invalid_nonce" }
  }

  const digest = computeMessageDigest(input.message)
  const valid = verifyDigestSignature(digest, input.signature)
  if (!valid) {
    return { ok: false as const, reason: "invalid_signature" }
  }

  await sql`
    UPDATE siwe_nonces
    SET used_at = NOW(), wallet_address = ${input.walletAddress}
    WHERE id = ${nonceRecord.id}
  `

  const sessionToken = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO wallet_sessions (
      user_id,
      wallet_address,
      chain_id,
      session_token,
      expires_at
    ) VALUES (
      ${input.userId ?? null},
      ${input.walletAddress.toLowerCase()},
      ${input.chainId ?? null},
      ${sessionToken},
      ${expiresAt}
    )
  `

  return {
    ok: true as const,
    walletSession: {
      sessionToken,
      expiresAt,
      walletAddress: input.walletAddress.toLowerCase(),
      chainId: input.chainId ?? null,
    },
  }
}
