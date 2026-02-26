import { NextRequest } from "next/server"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { WalletStore } from "@/lib/data/wallet-store"
import { createLinkProviderSession, toUserSafeProviderError } from "@/lib/services/link-provider-service"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const body = await request.json().catch(() => null)

  if (!body?.email) {
    return respondError(request, { code: "LINK_SESSION_BAD_REQUEST", message: "email is required" }, { status: 400, requestId })
  }

  try {
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

    return respondSuccess(request, session, {
      requestId,
      legacy: {
        providerRequestId: providerSession.providerRequestId,
      },
    })
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
