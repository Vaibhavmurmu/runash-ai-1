import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { QrService } from "@/lib/services/qr-service"

export const UPI_MIN_AMOUNT = 1
export const UPI_MAX_AMOUNT = 200_000
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_-]{8,120}$/

export function resolveTraceId(request: NextRequest) {
  return (
    request.headers.get("x-trace-id")?.trim() ||
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-correlation-id")?.trim() ||
    randomUUID()
  )
}

export function resolveUserId(request: NextRequest, body: unknown): string {
  const headerUserId = request.headers.get("x-user-id")?.trim()
  if (headerUserId) return headerUserId

  if (body && typeof body === "object" && "userId" in body) {
    const userId = (body as { userId?: unknown }).userId
    if (typeof userId === "string" && userId.trim()) {
      return userId.trim()
    }
  }

  return "anonymous"
}

export function validateAmountBounds(amount: unknown): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null
  if (amount < UPI_MIN_AMOUNT || amount > UPI_MAX_AMOUNT) return null
  return Math.round(amount * 100) / 100
}

export function validateUpiId(upiId: unknown): string | null {
  if (typeof upiId !== "string") return null
  const normalized = upiId.trim().toLowerCase()
  return QrService.isValidUPIId(normalized) ? normalized : null
}

export function resolveIdempotencyKey(request: NextRequest, body: unknown, fallbackPrefix: string): string {
  const fromHeader = request.headers.get("idempotency-key")?.trim()
  if (fromHeader && IDEMPOTENCY_KEY_PATTERN.test(fromHeader)) {
    return fromHeader
  }

  if (body && typeof body === "object" && "idempotencyKey" in body) {
    const candidate = (body as { idempotencyKey?: unknown }).idempotencyKey
    if (typeof candidate === "string") {
      const trimmed = candidate.trim()
      if (IDEMPOTENCY_KEY_PATTERN.test(trimmed)) {
        return trimmed
      }
    }
  }

  return `${fallbackPrefix}:${randomUUID()}`
}

export function isValidTransactionId(transactionId: string): boolean {
  return /^UPI-\d{8,16}-[A-Z0-9]{4,12}$/.test(transactionId)
}
