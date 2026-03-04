export const NORMALIZED_PAYMENT_STATES = [
  "pending",
  "processing",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
  "expired",
  "incomplete",
] as const

export type NormalizedPaymentState = (typeof NORMALIZED_PAYMENT_STATES)[number]

function toStateSet(states: NormalizedPaymentState[]): ReadonlySet<NormalizedPaymentState> {
  return new Set<NormalizedPaymentState>(states)
}

const ALLOWED_PAYMENT_TRANSITIONS: Record<NormalizedPaymentState, ReadonlySet<NormalizedPaymentState>> = {
  pending: toStateSet(["processing", "requires_action", "failed", "canceled", "expired", "incomplete"]),
  processing: toStateSet(["requires_action", "succeeded", "failed", "canceled", "expired", "incomplete"]),
  requires_action: toStateSet(["processing", "succeeded", "failed", "canceled", "expired", "incomplete"]),
  succeeded: toStateSet([]),
  failed: toStateSet(["processing"]),
  canceled: toStateSet([]),
  expired: toStateSet([]),
  incomplete: toStateSet(["processing", "requires_action", "failed", "canceled", "expired"]),
}

export function isNormalizedPaymentState(value: unknown): value is NormalizedPaymentState {
  return typeof value === "string" && (NORMALIZED_PAYMENT_STATES as readonly string[]).includes(value)
}

export function isTerminalPaymentState(status: NormalizedPaymentState) {
  return status === "succeeded" || status === "failed" || status === "canceled" || status === "expired"
}

export function isValidPaymentTransition(from: NormalizedPaymentState, to: NormalizedPaymentState) {
  if (from === to) return true
  return ALLOWED_PAYMENT_TRANSITIONS[from].has(to)
}
