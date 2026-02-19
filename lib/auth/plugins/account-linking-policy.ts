export interface AccountLinkingPolicyInput {
  providerId: string
  requestPath?: string
  userAgent?: string | null
  hasVerifiedIdentityHeader: boolean
  hasProviderIdentityToken: boolean
  currentUserEmailVerified: boolean
}

export interface AccountUnlinkingPolicyInput {
  providerId: string
  hasAlternativeSignInMethod: boolean
  hasRecentStepUpVerification: boolean
}

const forcedLinkProviders = new Set(
  (process.env.AUTH_FORCED_LINK_PROVIDERS ?? "google")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)

const manualMobileLinking = (process.env.AUTH_REQUIRE_MANUAL_LINKING_MOBILE ?? "true") !== "false"

export function isMobileUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return false
  }

  return /iphone|ipad|android|mobile/i.test(userAgent)
}

export function evaluateAccountLinkingPolicy(input: AccountLinkingPolicyInput): { allowed: boolean; reason?: string } {
  if (!input.currentUserEmailVerified) {
    return { allowed: false, reason: "primary_user_email_not_verified" }
  }

  if (manualMobileLinking && isMobileUserAgent(input.userAgent)) {
    const isManualLinkFlow = input.requestPath?.includes("/settings") || input.requestPath?.includes("/account/link")
    if (!isManualLinkFlow) {
      return { allowed: false, reason: "mobile_linking_requires_manual_flow" }
    }
  }

  const providerId = input.providerId.toLowerCase()
  const requiresForcedLinkGuard = forcedLinkProviders.has(providerId)

  if (!input.hasProviderIdentityToken) {
    return { allowed: false, reason: "verified_provider_token_required" }
  }

  if (!input.hasVerifiedIdentityHeader && !requiresForcedLinkGuard) {
    return { allowed: false, reason: "verified_identity_linking_required" }
  }

  if (requiresForcedLinkGuard && !input.hasVerifiedIdentityHeader) {
    return { allowed: false, reason: "forced_link_requires_step_up_verification" }
  }

  return { allowed: true }
}

export function evaluateAccountUnlinkingPolicy(input: AccountUnlinkingPolicyInput): { allowed: boolean; reason?: string } {
  if (!input.hasAlternativeSignInMethod) {
    return { allowed: false, reason: "cannot_unlink_last_login_method" }
  }

  if (!input.hasRecentStepUpVerification) {
    return { allowed: false, reason: "recent_step_up_verification_required" }
  }

  return { allowed: true }
}

export function getForcedLinkProviders() {
  return [...forcedLinkProviders]
}
