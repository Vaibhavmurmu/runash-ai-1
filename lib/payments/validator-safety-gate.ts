import { normalizePolicyThresholdAmounts } from "@/lib/payments/currency-normalizer"

const SUPPORTED_POLICY_CURRENCIES = new Set(["USD", "INR"])

export type PaymentSafetyReasonCode =
  | "INVALID_AMOUNT"
  | "UNSUPPORTED_CURRENCY"
  | "AMOUNT_EXCEEDS_USD_HITL_THRESHOLD"
  | "AMOUNT_EXCEEDS_INR_MFA_THRESHOLD"
  | "HITL_CONFIRMATION_REQUIRED"
  | "MFA_REQUIRED"

export type PaymentSafetyPolicyDecision = {
  allowed: boolean
  requiresHitl: boolean
  requiresMfa: boolean
  reasonCodes: PaymentSafetyReasonCode[]
  requires_hitl: boolean
  requires_mfa: boolean
  reason_codes: PaymentSafetyReasonCode[]
}

export type PaymentSafetyGateInput = {
  amount_minor: number
  currency: string
  human_confirmed?: boolean
  mfa_verified?: boolean
}

function getUsdHitlThresholdCents() {
  const configured = Number(process.env.RUNASH_HITL_THRESHOLD_USD_CENTS ?? "10000")
  return Number.isFinite(configured) && configured > 0 ? configured : 10000
}

function getInrMfaThresholdPaise() {
  const configured = Number(process.env.RUNASH_MFA_THRESHOLD_INR_PAISE ?? "800000")
  return Number.isFinite(configured) && configured > 0 ? configured : 800000
}

function getUsdToInrRate() {
  const configured = Number(process.env.RUNASH_USD_TO_INR_RATE ?? "83")
  return Number.isFinite(configured) && configured > 0 ? configured : 83
}

export function evaluateValidatorSafetyGate(input: PaymentSafetyGateInput): PaymentSafetyPolicyDecision {
  if (!Number.isFinite(input.amount_minor) || input.amount_minor <= 0) {
    return {
      allowed: false,
      requiresHitl: false,
      requiresMfa: false,
      reasonCodes: ["INVALID_AMOUNT"],
      requires_hitl: false,
      requires_mfa: false,
      reason_codes: ["INVALID_AMOUNT"],
    }
  }

  const currency = input.currency.toUpperCase()
  if (!SUPPORTED_POLICY_CURRENCIES.has(currency)) {
    return {
      allowed: false,
      requiresHitl: false,
      requiresMfa: false,
      reasonCodes: ["UNSUPPORTED_CURRENCY"],
      requires_hitl: false,
      requires_mfa: false,
      reason_codes: ["UNSUPPORTED_CURRENCY"],
    }
  }

  const usdToInrRate = getUsdToInrRate()
  const { usdEquivalentCents, inrEquivalentPaise } = normalizePolicyThresholdAmounts({
    amountMinor: input.amount_minor,
    currency,
    usdToInrRate,
  })

  const reasonCodes: PaymentSafetyReasonCode[] = []
  const requiresHitl = usdEquivalentCents > getUsdHitlThresholdCents()
  const requiresMfa = inrEquivalentPaise > getInrMfaThresholdPaise()

  if (requiresHitl) {
    reasonCodes.push("AMOUNT_EXCEEDS_USD_HITL_THRESHOLD")
  }

  if (requiresMfa) {
    reasonCodes.push("AMOUNT_EXCEEDS_INR_MFA_THRESHOLD")
  }

  if (requiresHitl && !input.human_confirmed) {
    reasonCodes.push("HITL_CONFIRMATION_REQUIRED")
  }

  if (requiresMfa && !input.mfa_verified) {
    reasonCodes.push("MFA_REQUIRED")
  }

  return {
    allowed: reasonCodes.every((reasonCode) => reasonCode !== "HITL_CONFIRMATION_REQUIRED" && reasonCode !== "MFA_REQUIRED"),
    requiresHitl,
    requiresMfa,
    reasonCodes,
    requires_hitl: requiresHitl,
    requires_mfa: requiresMfa,
    reason_codes: reasonCodes,
  }
}
