import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import {
  removeCustomerPaymentMethodReference,
  switchCustomerPaymentMethod,
  verifyPaymentMethodSessionIntegrity,
} from "@/services/payment-checkout-profile-service"

const switchMethodSchema = z
  .object({
    role: z.enum(["default", "backup"]),
  })
  .strict()

function resolveSessionContexts(request: NextRequest) {
  return {
    deviceContext: {
      ipHint: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
      acceptLanguage: request.headers.get("accept-language") ?? "",
      secChUaPlatform: request.headers.get("sec-ch-ua-platform") ?? "",
    },
    browserContext: {
      userAgent: request.headers.get("user-agent") ?? "",
    },
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const contexts = resolveSessionContexts(request)
  const sessionIntegrity = await verifyPaymentMethodSessionIntegrity({
    customerId: access.sessionUser.userId,
    ...contexts,
  })

  if (!sessionIntegrity.ok) {
    return respondError(
      request,
      {
        code: "PAYMENT_METHOD_SESSION_REAUTH_REQUIRED",
        message: "Payment method access requires re-authorization from this device.",
      },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const parsed = switchMethodSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_SWITCH_PAYLOAD", message: "Invalid switch payload" }, { status: 400 })
  }

  const profile = await switchCustomerPaymentMethod({
    customerId: access.sessionUser.userId,
    paymentMethodRefId: params.id,
    role: parsed.data.role,
  })

  if (!profile) {
    return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
  }

  return respondSuccess(request, profile)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const contexts = resolveSessionContexts(request)
  const sessionIntegrity = await verifyPaymentMethodSessionIntegrity({
    customerId: access.sessionUser.userId,
    ...contexts,
  })

  if (!sessionIntegrity.ok) {
    return respondError(
      request,
      {
        code: "PAYMENT_METHOD_SESSION_REAUTH_REQUIRED",
        message: "Payment method access requires re-authorization from this device.",
      },
      { status: 403 },
    )
  }

  const removed = await removeCustomerPaymentMethodReference({
    customerId: access.sessionUser.userId,
    paymentMethodRefId: params.id,
  })

  if (!removed) {
    return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
  }

  return respondSuccess(request, { removed: true })
}
