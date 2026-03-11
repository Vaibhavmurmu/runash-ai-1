import * as crypto from "crypto"

const TURN_CREDENTIAL_TTL_SECONDS = 10 * 60 // 10 minutes for browser sessions

export interface SignedTurnCredentials {
  iceServers: RTCIceServer[]
  ttl: number
  issuedAt: number
  expiresAt: number
}

export function signTurnCredentials(userId: string, sessionId: string | null | undefined): SignedTurnCredentials {
  const turnServerSecret = process.env.TURN_SERVER_SECRET
  const turnServerUrls = (process.env.TURN_SERVER_URLS || process.env.NEXT_PUBLIC_TURN_SERVER_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)

  if (!turnServerSecret) {
    throw new Error("turn_secret_not_configured")
  }

  if (turnServerUrls.length === 0) {
    throw new Error("turn_urls_not_configured")
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + TURN_CREDENTIAL_TTL_SECONDS
  const scopedSessionId = sessionId ?? "unknown-session"
  const username = `${expiresAt}:${userId}:${scopedSessionId}`

  const hmac = crypto.createHmac("sha1", turnServerSecret)
  hmac.update(username)
  const credential = hmac.digest("base64")

  return {
    iceServers: [
      {
        urls: turnServerUrls,
        username,
        credential,
      },
    ],
    ttl: TURN_CREDENTIAL_TTL_SECONDS,
    issuedAt,
    expiresAt,
  }
}
