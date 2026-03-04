import { createHmac, timingSafeEqual } from "crypto"
import { type EmailWebhookProvider } from "@/lib/email-webhooks/types"

export interface SignatureVerificationResult {
  ok: boolean
  reason?: string
}

function safeCompare(expected: string, received: string): boolean {
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function verifyHmac(secret: string, payload: string, receivedSignature: string): boolean {
  const expectedHex = createHmac("sha256", secret).update(payload).digest("hex")
  const normalized = receivedSignature.replace(/^sha256=/i, "")
  return safeCompare(expectedHex, normalized)
}

function extractSignatureTimestamp(signatureHeader: string, timestampHeader?: string | null): number | null {
  if (timestampHeader) {
    const parsed = Number.parseInt(timestampHeader, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  const pieces = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  const timestampPiece = pieces.find((item) => item.startsWith("t="))
  if (!timestampPiece) return null
  const parsed = Number.parseInt(timestampPiece.replace("t=", ""), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function verifyWebhookSignature(
  provider: EmailWebhookProvider,
  rawBody: string,
  headers: Headers,
): SignatureVerificationResult {
  if (provider === "ses") {
    return { ok: true, reason: "SES SNS signature verification not enforced in-app" }
  }

  const strict = process.env.EMAIL_WEBHOOK_STRICT_SIGNATURE === "true"
  const maxAgeSeconds = Number.parseInt(process.env.EMAIL_WEBHOOK_MAX_SIGNATURE_AGE_SECONDS ?? "300", 10)

  if (strict && !rawBody.trim()) {
    return { ok: false, reason: "Empty webhook payload" }
  }

  if (provider === "resend") {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) return strict ? { ok: false, reason: "Missing RESEND_WEBHOOK_SECRET" } : { ok: true }

    const signature = headers.get("resend-signature") || headers.get("x-resend-signature") || ""
    if (!signature) return { ok: false, reason: "Missing Resend signature header" }

    const pieces = signature.split(",").map((part) => part.trim())
    const signatureValue = pieces.find((item) => item.startsWith("v1="))?.replace("v1=", "") || signature
    const timestamp = extractSignatureTimestamp(signature, headers.get("resend-timestamp") || headers.get("x-resend-timestamp"))
    if (strict && timestamp !== null && Number.isFinite(maxAgeSeconds)) {
      const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
      if (ageSeconds > maxAgeSeconds) return { ok: false, reason: "Stale Resend signature timestamp" }
    }
    return verifyHmac(secret, rawBody, signatureValue) ? { ok: true } : { ok: false, reason: "Invalid Resend signature" }
  }

  if (provider === "sendgrid") {
    const secret = process.env.SENDGRID_WEBHOOK_SECRET
    if (!secret) return strict ? { ok: false, reason: "Missing SENDGRID_WEBHOOK_SECRET" } : { ok: true }

    const signature = headers.get("x-sendgrid-signature") || headers.get("x-twilio-email-event-webhook-signature") || ""
    if (!signature) return { ok: false, reason: "Missing SendGrid signature header" }

    const timestamp = extractSignatureTimestamp(signature, headers.get("x-sendgrid-timestamp"))
    if (strict && timestamp !== null && Number.isFinite(maxAgeSeconds)) {
      const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
      if (ageSeconds > maxAgeSeconds) return { ok: false, reason: "Stale SendGrid signature timestamp" }
    }

    return verifyHmac(secret, rawBody, signature) ? { ok: true } : { ok: false, reason: "Invalid SendGrid signature" }
  }

  const genericSecret = process.env.GENERIC_EMAIL_WEBHOOK_SECRET
  if (!genericSecret) return strict ? { ok: false, reason: "Missing GENERIC_EMAIL_WEBHOOK_SECRET" } : { ok: true }

  const genericSignature = headers.get("x-webhook-signature") || ""
  if (!genericSignature) return { ok: false, reason: "Missing generic signature header" }

  return verifyHmac(genericSecret, rawBody, genericSignature)
    ? { ok: true }
    : { ok: false, reason: "Invalid generic signature" }
}
