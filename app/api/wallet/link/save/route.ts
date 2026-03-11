import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { linkSaveRequestSchema, trackLinkFunnelMetric } from "@/lib/payments/link-funnel-observability"
import { logWalletPaymentTransition } from "@/lib/payments/wallet-audit-log"
import { saveLinkPaymentMethodViaProvider, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const correlationId = request.headers.get("x-correlation-id") ?? requestId
  const body = await request.json().catch(() => null)
  const parsed = linkSaveRequestSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(
      request,
      { code: "LINK_SAVE_BAD_REQUEST", message: "Invalid Link save payload" },
      { status: 400, requestId },
    )
  }

  try {
    const payload = parsed.data
    const providerPayment = await saveLinkPaymentMethodViaProvider({
      email: payload.email,
      holderName: payload.holderName,
      cardNumber: payload.cardNumber,
      expMonth: payload.expMonth,
      expYear: payload.expYear,
      billingAddress: payload.billingAddress,
      brand: payload.brand,
      requestId,
    })

    const card = await WalletStore.addCard({
      userId: payload.userId,
      holderName: payload.holderName,
      cardNumber: payload.cardNumber,
      expMonth: payload.expMonth,
      expYear: payload.expYear,
      billingAddress: payload.billingAddress,
      setDefault: true,
      brand: providerPayment.brand,
    })

    trackLinkFunnelMetric("checkout_completion", { requestId, correlationId, userId: payload.userId ?? null })
    logWalletPaymentTransition({ requestId, action: "wallet.link.payment_method.save", status: "success", userId: payload.userId })
    return respondSuccess(
      request,
      {
        message: "Payment information saved securely for Link autofill",
        card,
      },
      { requestId },
    )
  } catch (error) {
    const mapped = toUserSafeProviderError(error)
    logWalletPaymentTransition({ requestId, action: "wallet.link.payment_method.save", status: "failed", userId: parsed.success ? parsed.data.userId : undefined, reasonCodes: [mapped.code] })
    return respondError(
      request,
      {
        code: mapped.code,
        message: mapped.message,
      },
      {
        status: mapped.status,
        requestId,
        meta: { retryable: mapped.retryable },
      },
    )
  }
}
