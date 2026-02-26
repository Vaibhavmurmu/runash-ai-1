import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { saveLinkPaymentMethodViaProvider, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => null)

  if (!body?.holderName || !body?.cardNumber || !body?.expMonth || !body?.expYear || !body?.email) {
    return respondError(
      request,
      { code: "LINK_SAVE_BAD_REQUEST", message: "email, holderName, cardNumber, expMonth, expYear are required" },
      { status: 400, requestId },
    )
  }

  try {
    const providerPayment = await saveLinkPaymentMethodViaProvider({
      email: body.email,
      holderName: body.holderName,
      cardNumber: body.cardNumber,
      expMonth: Number(body.expMonth),
      expYear: Number(body.expYear),
      billingAddress: body.billingAddress,
      brand: body.brand,
      requestId,
    })

    const card = await WalletStore.addCard({
      userId: body.userId,
      holderName: body.holderName,
      cardNumber: body.cardNumber,
      expMonth: Number(body.expMonth),
      expYear: Number(body.expYear),
      billingAddress: body.billingAddress,
      setDefault: true,
      brand: providerPayment.brand,
    })

    return respondSuccess(
      request,
      {
        message: "Payment information saved securely for Link autofill",
        card,
      },
      {
        requestId,
        legacy: {
          providerRequestId: providerPayment.providerRequestId,
          providerPaymentMethodId: providerPayment.providerPaymentMethodId,
        },
      },
    )
  } catch (error) {
    const mapped = toUserSafeProviderError(error)
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
