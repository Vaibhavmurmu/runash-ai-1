import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { evaluateWalletSecurityControls, resolveRequestCountry } from "@/lib/payments/wallet-security-controls"
import { createLinkProviderSession, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => null)

  if (!body?.email) {
    return respondError(request, { code: "LINK_SESSION_BAD_REQUEST", message: "email is required" }, { status: 400, requestId })
  }

  try {
    const decision = evaluateWalletSecurityControls({
      actionType: "link_checkout",
      amountMinor: Number(body.amountMinor ?? body.amount ?? 1),
      currency: body.currency === "INR" ? "INR" : "USD",
      humanConfirmed: Boolean(body.human_confirmed),
      mfaVerified: Boolean(body.mfa_verified),
      userCountry: typeof body.userCountry === "string" ? body.userCountry : null,
      requestCountry: resolveRequestCountry(request),
      riskScore: Number.isFinite(Number(body.riskScore)) ? Number(body.riskScore) : null,
      riskSignals: Array.isArray(body.riskSignals) ? body.riskSignals : [],
    })

    if (!decision.allowed) {
      logWalletPaymentTransition({
        requestId,
        action: "wallet.link.session.create",
        status: "blocked",
        userId: body.userId,
        reasonCodes: decision.reasonCodes,
      })
      return respondError(request, { code: "LINK_SESSION_BLOCKED", message: "Security validation blocked this Link session" }, { status: 403, requestId, meta: { reason_codes: decision.reasonCodes } })
    }

    if (decision.requiresReview) {
      logWalletPaymentTransition({
        requestId,
        action: "wallet.link.session.create",
        status: "review",
        userId: body.userId,
        reasonCodes: decision.reasonCodes,
      })
      return respondError(request, { code: "LINK_SESSION_REVIEW_REQUIRED", message: "Security review required before creating Link session" }, { status: 409, requestId, meta: { reason_codes: decision.reasonCodes } })
    }

    const providerSession = await createLinkProviderSession({
      userId: body.userId,
      email: body.email,
      requestId,
    })

    const session = await WalletStore.createLinkSessionWithProvider({
      userId: body.userId,
      email: body.email,
      provider: providerSession.provider,
      providerSessionId: providerSession.providerSessionId,
      providerCustomerId: providerSession.providerCustomerId,
      providerRequestId: providerSession.providerRequestId,
      maskedPhone: providerSession.maskedPhone,
    })

    logWalletPaymentTransition({ requestId, action: "wallet.link.session.create", status: "success", userId: body.userId })

    return respondSuccess(request, session, {
      requestId,
      legacy: {
        providerRequestId: providerSession.providerRequestId,
      },
    })
  } catch (error) {
    const mapped = toUserSafeProviderError(error)
    logWalletPaymentTransition({ requestId, action: "wallet.link.session.create", status: "failed", userId: body?.userId, reasonCodes: [mapped.code] })
    return respondError(
      request,
      {
        code: mapped.code,
        message: mapped.message,
      },
      {
        status: 502,
        requestId,
        legacy: {
          providerRequestId: mapped.providerRequestId,
        },
      },
    )
  }
}
