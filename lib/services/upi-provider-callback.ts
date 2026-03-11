import { createHmac, timingSafeEqual } from "crypto"

import type { UpiProviderStatus } from "@/lib/services/upi-checkout-service"

export type UpiProviderCallbackPayload = {
  transactionId: string
  status: UpiProviderStatus
  providerReference?: string
  eventId?: string
}

function normalizeHex(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "")
}

export function verifyUpiProviderSignature(input: { payload: string; signature: string | null; secret: string | undefined }) {
  if (!input.secret || !input.signature) return false

  const expected = createHmac("sha256", input.secret).update(input.payload).digest("hex")
  const received = normalizeHex(input.signature)

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)

  if (expectedBuffer.length !== receivedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export function parseProviderStatus(raw: unknown): UpiProviderStatus | null {
  if (typeof raw !== "string") return null
  const value = raw.trim().toUpperCase()
  if (
    value === "SUCCESS" ||
    value === "FAILED" ||
    value === "PENDING" ||
    value === "PROCESSING" ||
    value === "AUTHORIZED" ||
    value === "TIMEOUT"
  ) {
    return value
  }
  return null
}

export function parseUpiProviderCallbackPayload(raw: unknown): UpiProviderCallbackPayload | null {
  if (!raw || typeof raw !== "object") return null

  const transactionId = typeof (raw as { transactionId?: unknown }).transactionId === "string"
    ? (raw as { transactionId: string }).transactionId.trim()
    : ""
  const status = parseProviderStatus((raw as { status?: unknown }).status)

  if (!transactionId || !status) return null

  return {
    transactionId,
    status,
    providerReference:
      typeof (raw as { providerReference?: unknown }).providerReference === "string"
        ? (raw as { providerReference: string }).providerReference.trim() || undefined
        : undefined,
    eventId:
      typeof (raw as { eventId?: unknown }).eventId === "string"
        ? (raw as { eventId: string }).eventId.trim() || undefined
        : undefined,
  }
}
