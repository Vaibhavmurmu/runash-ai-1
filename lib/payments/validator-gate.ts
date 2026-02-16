import { isAmountAboveUsdEquivalentThreshold } from "@/lib/payments/currency-normalizer"

export type ValidatorReasonCode =
  | "INVALID_AMOUNT"
  | "HITL_CONFIRMATION_REQUIRED"
  | "MFA_REQUIRED_FOR_HIGH_VALUE_INR"

export interface ValidatorDecision {
  requiresHitl: boolean
  requiresMfa: boolean
  allowed: boolean
  reasonCodes: ValidatorReasonCode[]
}

interface ValidatorGateInput {
  amountMinor: number
  currency: string
  humanConfirmed?: boolean
  mfaVerified?: boolean
}

function getUsdHitlThresholdCents() {
  const configured = Number(process.env.RUNASH_HITL_THRESHOLD_USD_CENTS ?? "10000")
  return Number.isFinite(configured) && configured > 0 ? configured : 10000
}

function getInrHitlThresholdPaise() {
  const configured = Number(process.env.RUNASH_HITL_THRESHOLD_INR_PAISE ?? "")
  return Number.isFinite(configured) && configured > 0 ? configured : null
}

function getMfaThresholdInrPaise() {
  const configured = Number(process.env.RUNASH_MFA_THRESHOLD_INR_PAISE ?? "800000")
  return Number.isFinite(configured) && configured > 0 ? configured : 800000
}

export function evaluatePaymentValidatorGate(input: ValidatorGateInput): ValidatorDecision {
  if (!Number.isFinite(input.amountMinor) || input.amountMinor <= 0) {
    return {
      requiresHitl: false,
      requiresMfa: false,
      allowed: false,
      reasonCodes: ["INVALID_AMOUNT"],
    }
  }

  const currency = input.currency.toUpperCase()
  const usdToInrRate = Number(process.env.RUNASH_USD_TO_INR_RATE ?? "83")
  const inrHitlThresholdPaise = getInrHitlThresholdPaise()

  const requiresHitlByCurrencyThreshold =
    currency === "INR" && inrHitlThresholdPaise != null ? input.amountMinor > inrHitlThresholdPaise : false

  const requiresHitlByUsdEquivalent = isAmountAboveUsdEquivalentThreshold({
    amountMinor: input.amountMinor,
    currency,
    usdThresholdCents: getUsdHitlThresholdCents(),
    usdToInrRate,
  })

  const requiresHitl = requiresHitlByCurrencyThreshold || requiresHitlByUsdEquivalent
  const requiresMfa = currency === "INR" && input.amountMinor > getMfaThresholdInrPaise()

  const reasonCodes: ValidatorReasonCode[] = []

  if (requiresHitl && !input.humanConfirmed) {
    reasonCodes.push("HITL_CONFIRMATION_REQUIRED")
  }

  if (requiresMfa && !input.mfaVerified) {
    reasonCodes.push("MFA_REQUIRED_FOR_HIGH_VALUE_INR")
  }

  return {
    requiresHitl,
    requiresMfa,
    allowed: reasonCodes.length === 0,
    reasonCodes,
  }
}
