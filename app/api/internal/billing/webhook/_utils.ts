import { createHmac, timingSafeEqual } from "crypto"
import { type NextRequest } from "next/server"

const INTERNAL_SIGNATURE_WINDOW_SECONDS = 300

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function computeSignature(secret: string, timestamp: string, payload: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
}

export async function verifyInternalBillingWebhookSignature(request: NextRequest) {
  const secret = process.env.INTERNAL_BILLING_WEBHOOK_SECRET
  const timestamp = request.headers.get("x-runash-timestamp")
  const signature = request.headers.get("x-runash-signature")
  const rawBody = await request.text()

  if (!secret || !timestamp || !signature) {
    return { ok: false as const, reason: "missing_signature", rawBody }
  }

  const timestampValue = Number(timestamp)
  if (!Number.isFinite(timestampValue)) {
    return { ok: false as const, reason: "invalid_timestamp", rawBody }
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Math.floor(timestampValue))
  if (ageSeconds > INTERNAL_SIGNATURE_WINDOW_SECONDS) {
    return { ok: false as const, reason: "timestamp_out_of_window", rawBody }
  }

  const expected = computeSignature(secret, timestamp, rawBody)
  if (!safeEqual(expected, signature)) {
    return { ok: false as const, reason: "signature_mismatch", rawBody }
  }

  return { ok: true as const, rawBody }
}
