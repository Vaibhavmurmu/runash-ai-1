import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { evaluateWalletSecurityControls, resolveRequestCountry } from "@/lib/payments/wallet-security-controls"

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const userId = request.nextUrl.searchParams.get("userId")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50")
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0")
  const status = request.nextUrl.searchParams.get("status")
  const search = request.nextUrl.searchParams.get("search")
  return respondSuccess(
    request,
    await WalletStore.listSubscriptions(userId, {
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
      status: status === "active" || status === "paused" || status === "canceled" ? status : null,
      search: search || undefined,
    }),
    { requestId },
  )
}

export async function PATCH(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => null)
  if (!body?.subscriptionId || !body?.eventType) {
    return respondError(request, { code: "WALLET_SUBSCRIPTION_BAD_REQUEST", message: "subscriptionId and eventType are required" }, { status: 400, requestId })
  }

  const userId = typeof body.userId === "string" ? body.userId : null
  const decision = evaluateWalletSecurityControls({
    actionType: "wallet_subscription_state_change",
    humanConfirmed: Boolean(body.human_confirmed),
    mfaVerified: Boolean(body.mfa_verified),
    userCountry: typeof body.userCountry === "string" ? body.userCountry : null,
    requestCountry: resolveRequestCountry(request),
    riskScore: Number.isFinite(Number(body.riskScore)) ? Number(body.riskScore) : null,
    riskSignals: Array.isArray(body.riskSignals) ? body.riskSignals : [],
  })

  if (!decision.allowed) {
    logWalletPaymentTransition({ requestId, action: "wallet.subscription.status.update", status: "blocked", userId, reasonCodes: decision.reasonCodes })
    return respondError(request, { code: "WALLET_SUBSCRIPTION_UPDATE_BLOCKED", message: "Subscription state change blocked" }, { status: 403, requestId, meta: { reason_codes: decision.reasonCodes } })
  }

  if (decision.requiresReview) {
    logWalletPaymentTransition({ requestId, action: "wallet.subscription.status.update", status: "review", userId, reasonCodes: decision.reasonCodes })
    return respondError(request, { code: "WALLET_SUBSCRIPTION_REVIEW_REQUIRED", message: "Subscription state change requires review" }, { status: 409, requestId, meta: { reason_codes: decision.reasonCodes } })
  }

  const updated = await WalletStore.updateSubscription(userId || "", body.subscriptionId, {
    status: body.status,
    plan: typeof body.plan === "string" ? body.plan : undefined,
    reason: typeof body.reason === "string" ? body.reason : undefined,
    eventType: body.eventType,
  })
  if (!updated) {
    return respondError(request, { code: "WALLET_SUBSCRIPTION_NOT_FOUND", message: "Subscription not found" }, { status: 404, requestId })
  }

  logWalletPaymentTransition({ requestId, action: "wallet.subscription.status.update", status: "success", userId })
  return respondSuccess(request, updated, { requestId })
}
