import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { linkSessionRequestSchema, trackLinkFunnelMetric } from "@/lib/payments/link-funnel-observability"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { evaluateWalletSecurityControls, resolveRequestCountry } from "@/lib/payments/wallet-security-controls"
import { createLinkProviderSession, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const correlationId = request.headers.get("x-correlation-id") ?? requestId
  const body = await request.json().catch(() => null)
  const parsed = linkSessionRequestSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "LINK_SESSION_BAD_REQUEST", message: "Invalid Link session payload" }, { status: 400, requestId })
  }

  try {
    const payload = parsed.data
    const decision = evaluateWalletSecurityControls({
      actionType: "link_checkout",
      amountMinor: Number(payload.amountMinor ?? payload.amount ?? 1),
      currency: payload.currency === "INR" ? "INR" : "USD",
      humanConfirmed: Boolean(payload.human_confirmed),
      mfaVerified: Boolean(payload.mfa_verified),
      userCountry: typeof payload.userCountry === "string" ? payload.userCountry : null,
      requestCountry: resolveRequestCountry(request),
      riskScore: Number.isFinite(Number(payload.riskScore)) ? Number(payload.riskScore) : null,
      riskSignals: Array.isArray(payload.riskSignals) ? payload.riskSignals : [],
    })

    if (!decision.allowed) {
      logWalletPaymentTransition({
        requestId,
        action: "wallet.link.session.create",
        status: "blocked",
        userId: payload.userId,
        reasonCodes: decision.reasonCodes,
      })
      return respondError(request, { code: "LINK_SESSION_BLOCKED", message: "Security validation blocked this Link session" }, { status: 403, requestId, meta: { reason_codes: decision.reasonCodes } })
    }

    if (decision.requiresReview) {
      logWalletPaymentTransition({
        requestId,
        action: "wallet.link.session.create",
        status: "review",
        userId: payload.userId,
        reasonCodes: decision.reasonCodes,
      })
      return respondError(request, { code: "LINK_SESSION_REVIEW_REQUIRED", message: "Security review required before creating Link session" }, { status: 409, requestId, meta: { reason_codes: decision.reasonCodes } })
    }

    const providerSession = await createLinkProviderSession({
      userId: payload.userId,
      email: payload.email,
      requestId,
    })

    const session = await WalletStore.createLinkSessionWithProvider({
      userId: payload.userId,
      email: payload.email,
      provider: providerSession.provider,
      providerSessionId: providerSession.providerSessionId,
      providerCustomerId: providerSession.providerCustomerId,
      providerRequestId: providerSession.providerRequestId,
      maskedPhone: providerSession.maskedPhone,
    })

    logWalletPaymentTransition({ requestId, action: "wallet.link.session.create", status: "success", userId: payload.userId })
    trackLinkFunnelMetric("session_created", { requestId, correlationId, userId: payload.userId ?? null })

    return respondSuccess(request, session, { requestId })
  } catch (error) {
    const mapped = toUserSafeProviderError(error)
    logWalletPaymentTransition({ requestId, action: "wallet.link.session.create", status: "failed", userId: parsed.success ? parsed.data.userId : undefined, reasonCodes: [mapped.code] })
    return respondError(
      request,
      {
        code: mapped.code,
        message: mapped.message,
      },
      {
        status: 502,
        requestId,
      },
    )
  }
}
