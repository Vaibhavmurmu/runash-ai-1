import {
  evaluateValidatorSafetyGate,
  type PaymentSafetyReasonCode,
  type PaymentSafetyPolicyDecision,
} from "@/lib/payments/validator-safety-gate"
import { normalizePolicyThresholdAmounts } from "@/lib/payments/currency-normalizer"

export type ValidatorReasonCode =
  | PaymentSafetyReasonCode
  | "MFA_REQUIRED_FOR_HIGH_VALUE_INR"

export interface ValidatorDecision {
  requiresHitl: boolean
  requiresMfa: boolean
  allowed: boolean
  reasonCodes: ValidatorReasonCode[]
}


export interface ValidatorMiddlewareResult {
  allowed: boolean
  decision: ValidatorDecision
  thresholds: {
    hitlUsdCents: number
    mfaInrPaise: number
  }
  normalized: {
    currency: string
    usdEquivalentCents: number
    inrEquivalentPaise: number
  }
}

interface ValidatorGateInput {
  amountMinor: number
  currency: string
  humanConfirmed?: boolean
  mfaVerified?: boolean
}

function mapPolicyDecision(decision: PaymentSafetyPolicyDecision): ValidatorDecision {
  const reasonCodes: ValidatorReasonCode[] = decision.reason_codes.map((reasonCode) =>
    reasonCode === "MFA_REQUIRED" ? "MFA_REQUIRED_FOR_HIGH_VALUE_INR" : reasonCode,
  )

  return {
    allowed: decision.allowed,
    requiresHitl: decision.requires_hitl,
    requiresMfa: decision.requires_mfa,
    reasonCodes,
  }
}

export function evaluatePaymentValidatorGate(input: ValidatorGateInput): ValidatorDecision {
  const policyDecision = evaluateValidatorSafetyGate({
    amount_minor: input.amountMinor,
    currency: input.currency,
    human_confirmed: input.humanConfirmed,
    mfa_verified: input.mfaVerified,
  })

  return mapPolicyDecision(policyDecision)
}


function getHitlThresholdUsdCents() {
  const configured = Number(process.env.RUNASH_HITL_THRESHOLD_USD_CENTS ?? "10000")
  return Number.isFinite(configured) && configured > 0 ? configured : 10000
}

function getMfaThresholdInrPaise() {
  const configured = Number(process.env.RUNASH_MFA_THRESHOLD_INR_PAISE ?? "800000")
  return Number.isFinite(configured) && configured > 0 ? configured : 800000
}

function getUsdToInrRate() {
  const configured = Number(process.env.RUNASH_USD_TO_INR_RATE ?? "83")
  return Number.isFinite(configured) && configured > 0 ? configured : 83
}

export function enforcePaymentValidatorMiddleware(input: ValidatorGateInput): ValidatorMiddlewareResult {
  const decision = evaluatePaymentValidatorGate(input)
  const normalized = normalizePolicyThresholdAmounts({
    amountMinor: input.amountMinor,
    currency: input.currency,
    usdToInrRate: getUsdToInrRate(),
  })

  return {
    allowed: decision.allowed,
    decision,
    thresholds: {
      hitlUsdCents: getHitlThresholdUsdCents(),
      mfaInrPaise: getMfaThresholdInrPaise(),
    },
    normalized,
  }
}
