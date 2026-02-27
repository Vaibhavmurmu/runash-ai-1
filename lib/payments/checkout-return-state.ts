import { createHmac, randomUUID, timingSafeEqual } from "crypto"

const DEFAULT_TTL_SECONDS = 60 * 30

type CheckoutReturnStatePayload = {
  checkoutSessionId: string
  customerId: string
  providerTransactionReference: string
  issuedAt: number
  expiresAt: number
  nonce: string
}

function getSigningSecret() {
  return process.env.CHECKOUT_RETURN_STATE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "runash-dev-checkout-state"
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url")
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8")
}

function signRaw(rawPayload: string) {
  return createHmac("sha256", getSigningSecret()).update(rawPayload).digest("base64url")
}

export function createSignedCheckoutReturnState(input: {
  checkoutSessionId: string
  customerId: string
  providerTransactionReference: string
  ttlSeconds?: number
}) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS)
  const payload: CheckoutReturnStatePayload = {
    checkoutSessionId: input.checkoutSessionId,
    customerId: input.customerId,
    providerTransactionReference: input.providerTransactionReference,
    issuedAt,
    expiresAt,
    nonce: randomUUID(),
  }

  const serializedPayload = JSON.stringify(payload)
  const payloadBase64 = toBase64Url(serializedPayload)
  const signature = signRaw(payloadBase64)
  return `${payloadBase64}.${signature}`
}

export function verifySignedCheckoutReturnState(token: string) {
  const [payloadBase64, signature] = token.split(".")
  if (!payloadBase64 || !signature) {
    return { ok: false as const, code: "MALFORMED_STATE" as const }
  }

  const expectedSignature = signRaw(payloadBase64)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { ok: false as const, code: "INVALID_SIGNATURE" as const }
  }

  try {
    const decodedPayload = JSON.parse(fromBase64Url(payloadBase64)) as CheckoutReturnStatePayload
    if (decodedPayload.expiresAt < Math.floor(Date.now() / 1000)) {
      return { ok: false as const, code: "STATE_EXPIRED" as const }
    }

    if (!decodedPayload.checkoutSessionId || !decodedPayload.providerTransactionReference || !decodedPayload.customerId) {
      return { ok: false as const, code: "INVALID_PAYLOAD" as const }
    }

    return { ok: true as const, payload: decodedPayload }
  } catch {
    return { ok: false as const, code: "INVALID_PAYLOAD" as const }
  }
}
