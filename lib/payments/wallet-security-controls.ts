import { evaluateValidatorSafetyGate, type PaymentSafetyReasonCode } from "@/lib/payments/validator-safety-gate"

export type WalletRiskReasonCode =
  | PaymentSafetyReasonCode
  | "ACTION_REQUIRES_HITL"
  | "ACTION_REQUIRES_MFA"
  | "GEO_MISMATCH_REVIEW"
  | "RISK_SCORE_REVIEW"
  | "RISK_SCORE_BLOCK"
  | "RISK_SIGNAL_BLOCKED"

export type WalletActionType = "link_checkout" | "wallet_default_method_change" | "wallet_subscription_state_change"

export interface WalletSecurityDecision {
  allowed: boolean
  requiresReview: boolean
  reasonCodes: WalletRiskReasonCode[]
}

const HIGH_RISK_ACTIONS = new Set<WalletActionType>(["wallet_default_method_change", "wallet_subscription_state_change"])

function resolveRiskThreshold(name: string, fallback: number) {
  const configured = Number(process.env[name] ?? String(fallback))
  return Number.isFinite(configured) ? configured : fallback
}

export function evaluateWalletSecurityControls(input: {
  actionType: WalletActionType
  amountMinor?: number
  currency?: "USD" | "INR"
  humanConfirmed?: boolean
  mfaVerified?: boolean
  userCountry?: string | null
  requestCountry?: string | null
  riskScore?: number | null
  riskSignals?: string[]
}): WalletSecurityDecision {
  const reasonCodes: WalletRiskReasonCode[] = []
  const requiresHighRiskControls = HIGH_RISK_ACTIONS.has(input.actionType)

  if (input.actionType === "link_checkout") {
    const amountMinor = Number(input.amountMinor ?? 0)
    const policy = evaluateValidatorSafetyGate({
      amount_minor: amountMinor,
      currency: input.currency ?? "USD",
      human_confirmed: input.humanConfirmed,
      mfa_verified: input.mfaVerified,
    })
    reasonCodes.push(...policy.reason_codes)
  }

  if (requiresHighRiskControls && !input.humanConfirmed) {
    reasonCodes.push("ACTION_REQUIRES_HITL")
  }

  if (requiresHighRiskControls && !input.mfaVerified) {
    reasonCodes.push("ACTION_REQUIRES_MFA")
  }

  const normalizedUserCountry = input.userCountry?.trim().toUpperCase() ?? null
  const normalizedRequestCountry = input.requestCountry?.trim().toUpperCase() ?? null
  if (normalizedUserCountry && normalizedRequestCountry && normalizedUserCountry !== normalizedRequestCountry) {
    reasonCodes.push("GEO_MISMATCH_REVIEW")
  }

  const riskScore = input.riskScore ?? 0
  const reviewThreshold = resolveRiskThreshold("RUNASH_RISK_REVIEW_SCORE", 60)
  const blockThreshold = resolveRiskThreshold("RUNASH_RISK_BLOCK_SCORE", 80)

  if (riskScore >= blockThreshold) {
    reasonCodes.push("RISK_SCORE_BLOCK")
  } else if (riskScore >= reviewThreshold) {
    reasonCodes.push("RISK_SCORE_REVIEW")
  }

  const blockSignals = new Set((process.env.RUNASH_RISK_BLOCK_SIGNALS ?? "stolen_card,tor_exit,impossible_travel").split(",").map((signal) => signal.trim()).filter(Boolean))
  const hasBlockSignal = (input.riskSignals ?? []).some((signal) => blockSignals.has(signal))
  if (hasBlockSignal) {
    reasonCodes.push("RISK_SIGNAL_BLOCKED")
  }

  const blockedReasons = new Set<WalletRiskReasonCode>([
    "HITL_CONFIRMATION_REQUIRED",
    "MFA_REQUIRED",
    "ACTION_REQUIRES_HITL",
    "ACTION_REQUIRES_MFA",
    "RISK_SCORE_BLOCK",
    "RISK_SIGNAL_BLOCKED",
  ])

  const reviewReasons = new Set<WalletRiskReasonCode>(["GEO_MISMATCH_REVIEW", "RISK_SCORE_REVIEW"])

  const allowed = reasonCodes.every((reasonCode) => !blockedReasons.has(reasonCode))
  const requiresReview = reasonCodes.some((reasonCode) => reviewReasons.has(reasonCode))

  return {
    allowed,
    requiresReview,
    reasonCodes,
  }
}

export function resolveRequestCountry(request: Request): string | null {
  return request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? null
}
