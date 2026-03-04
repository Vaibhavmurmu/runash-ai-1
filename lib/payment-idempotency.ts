import { createHash } from "crypto"

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export function resolveCreateIntentIdempotencyKey(input: {
  providedKey?: string
  userId: string
  organizationId: string
  amount: number
  currency: string
  paymentMethodId: string
  metadata?: Record<string, unknown>
}): string {
  if (input.providedKey) return input.providedKey

  const basis = JSON.stringify({
    userId: input.userId,
    organizationId: input.organizationId,
    amount: input.amount,
    currency: input.currency,
    paymentMethodId: input.paymentMethodId,
    metadata: input.metadata ?? {},
  })

  return `create:${input.userId}:${digest(basis)}`
}

export function resolveConfirmIntentIdempotencyKey(input: {
  providedKey?: string
  userId: string
  organizationId: string
  intentId: string
}): string {
  if (input.providedKey) return input.providedKey

  const basis = `${input.userId}:${input.organizationId}:${input.intentId}`
  return `confirm:${input.userId}:${digest(basis)}`
}
