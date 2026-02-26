import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { evaluateWalletSecurityControls, resolveRequestCountry } from "@/lib/payments/wallet-security-controls"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => ({}))
  const userId = typeof body.userId === "string" ? body.userId : null

  const decision = evaluateWalletSecurityControls({
    actionType: "wallet_default_method_change",
    humanConfirmed: Boolean(body.human_confirmed),
    mfaVerified: Boolean(body.mfa_verified),
    userCountry: typeof body.userCountry === "string" ? body.userCountry : null,
    requestCountry: resolveRequestCountry(request),
    riskScore: Number.isFinite(Number(body.riskScore)) ? Number(body.riskScore) : null,
    riskSignals: Array.isArray(body.riskSignals) ? body.riskSignals : [],
  })

  if (!decision.allowed) {
    logWalletPaymentTransition({ requestId, action: "wallet.cards.default.update", status: "blocked", userId, reasonCodes: decision.reasonCodes })
    return respondError(request, { code: "WALLET_DEFAULT_METHOD_BLOCKED", message: "Default payment method change blocked" }, { status: 403, requestId, meta: { reason_codes: decision.reasonCodes } })
  }

  if (decision.requiresReview) {
    logWalletPaymentTransition({ requestId, action: "wallet.cards.default.update", status: "review", userId, reasonCodes: decision.reasonCodes })
    return respondError(request, { code: "WALLET_DEFAULT_METHOD_REVIEW_REQUIRED", message: "Default payment method change requires review" }, { status: 409, requestId, meta: { reason_codes: decision.reasonCodes } })
  }

  const updated = await WalletStore.setDefaultCard(userId || "", params.id)
  if (!updated) {
    return respondError(request, { code: "WALLET_CARD_NOT_FOUND", message: "Card not found" }, { status: 404, requestId })
  }

  logWalletPaymentTransition({ requestId, action: "wallet.cards.default.update", status: "success", userId })
  return respondSuccess(request, updated, { requestId })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = resolveRequestId(request)
  const userId = request.nextUrl.searchParams.get("userId")
  const deleted = await WalletStore.removeCard(userId || "", params.id)
  if (!deleted) {
    return respondError(request, { code: "WALLET_CARD_NOT_FOUND", message: "Card not found" }, { status: 404, requestId })
  }

  logWalletPaymentTransition({ requestId, action: "wallet.cards.delete", status: "success", userId })
  return respondSuccess(request, deleted, { requestId })
}
