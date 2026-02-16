import {
  evaluateValidatorSafetyGate,
  type PaymentSafetyReasonCode,
  type PaymentSafetyPolicyDecision,
} from "@/lib/payments/validator-safety-gate"

export type ValidatorReasonCode =
  | PaymentSafetyReasonCode
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
