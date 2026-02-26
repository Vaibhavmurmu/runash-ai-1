import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { fetchLinkVerificationFromProvider, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => null)

  if (!body?.sessionId) {
    return respondError(
      request,
      { code: "LINK_VERIFY_BAD_REQUEST", message: "sessionId is required" },
      { status: 400, requestId },
    )
  }

  const session = await WalletStore.getLinkSessionById(body.sessionId)
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
      { status: 400, requestId, legacy: { providerRequestId: session.providerRequestId ?? null } },
    )
  }

  if (!session.providerSessionId) {
    return respondError(
      request,
      { code: "LINK_VERIFICATION_FAILED", message: "Provider session missing" },
      { status: 400, requestId, legacy: { providerRequestId: session.providerRequestId ?? null } },
    )
  }

  try {
    const providerVerification = await fetchLinkVerificationFromProvider(session.providerSessionId)

    const updated = await WalletStore.updateLinkSessionProviderStatus({
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
          legacy: {
            providerRequestId: providerVerification.providerRequestId,
            verificationStatus: providerVerification.status,
          },
        },
      )
    }

    const autofill = await WalletStore.getLinkAutofillForSession(session.id)

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
        legacy: {
          providerRequestId: providerVerification.providerRequestId,
          verificationStatus: updated?.providerVerificationStatus ?? "verified",
        },
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
        legacy: {
          providerRequestId: mapped.providerRequestId,
        },
      },
    )
  }
}
