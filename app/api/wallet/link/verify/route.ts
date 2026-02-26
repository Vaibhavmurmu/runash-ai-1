import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { linkVerifyRequestSchema, trackLinkFunnelMetric } from "@/lib/payments/link-funnel-observability"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { fetchLinkVerificationFromProvider, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const correlationId = request.headers.get("x-correlation-id") ?? requestId
  const body = await request.json().catch(() => null)
  const parsed = linkVerifyRequestSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(
      request,
      { code: "LINK_VERIFY_BAD_REQUEST", message: "Invalid Link verify payload" },
      { status: 400, requestId },
    )
  }

  const session = await WalletStore.getLinkSessionById(parsed.data.sessionId)
  if (!session) {
    return respondError(request, { code: "LINK_VERIFICATION_FAILED", message: "Session not found" }, { status: 404, requestId })
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await WalletStore.updateLinkSessionProviderStatus({
      sessionId: session.id,
      status: "expired",
      reason: "session_expired",
      providerRequestId: session.providerRequestId,
    })

    logWalletPaymentTransition({ requestId, action: "wallet.link.verify", status: "failed", userId: session.userId, sessionId: session.id, reasonCodes: ["SESSION_EXPIRED"] })
    return respondError(
      request,
      { code: "LINK_VERIFICATION_FAILED", message: "Session expired" },
      { status: 400, requestId },
    )
  }

  if (!session.providerSessionId) {
    return respondError(
      request,
      { code: "LINK_VERIFICATION_FAILED", message: "Provider session missing" },
      { status: 400, requestId },
    )
  }

  try {
    const providerVerification = await fetchLinkVerificationFromProvider(session.providerSessionId)

    await WalletStore.updateLinkSessionProviderStatus({
      sessionId: session.id,
      status: providerVerification.status,
      reason: providerVerification.reason,
      providerRequestId: providerVerification.providerRequestId,
    })

    if (providerVerification.status !== "verified") {
      const message =
        providerVerification.status === "pending"
          ? "Verification still pending webhook confirmation"
          : providerVerification.status === "expired"
            ? "Session expired"
            : "Link verification failed"

      logWalletPaymentTransition({ requestId, action: "wallet.link.verify", status: providerVerification.status === "pending" ? "review" : "failed", userId: session.userId, sessionId: session.id, reasonCodes: [providerVerification.status === "pending" ? "PROVIDER_PENDING" : "PROVIDER_FAILED"] })
      return respondError(
        request,
        { code: "LINK_VERIFICATION_FAILED", message },
        {
          status: providerVerification.status === "pending" ? 202 : 400,
          requestId,
        },
      )
    }

    const autofill = await WalletStore.getLinkAutofillForSession(session.id)

    trackLinkFunnelMetric("session_verified", { requestId, correlationId, sessionId: session.id, userId: session.userId })
    if (autofill.autofill) {
      trackLinkFunnelMetric("autofill_success", { requestId, correlationId, sessionId: session.id, userId: session.userId })
    }

    logWalletPaymentTransition({ requestId, action: "wallet.link.verify", status: "success", userId: session.userId, sessionId: session.id })
    return respondSuccess(
      request,
      {
        ok: true,
        status: "verified",
        providerRequestId: providerVerification.providerRequestId,
        defaultCard: autofill.defaultCard,
        autofill: autofill.autofill,
      },
      {
        requestId,
      },
    )
  } catch (error) {
    const mapped = toUserSafeProviderError(error)
    logWalletPaymentTransition({ requestId, action: "wallet.link.verify", status: "failed", userId: session.userId, sessionId: session.id, reasonCodes: [mapped.code] })
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
