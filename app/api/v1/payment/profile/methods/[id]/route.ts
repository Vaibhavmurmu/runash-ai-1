import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { emitPaymentLifecycleEvent } from "@/lib/services/payment-lifecycle-events"
import {
  getCustomerPaymentMethodReference,
  removeCustomerPaymentMethodReference,
  switchCustomerPaymentMethod,
  updateCustomerPaymentMethodReference,
  verifyPaymentMethodSessionIntegrity,
} from "@/services/payment-checkout-profile-service"

const switchMethodSchema = z
  .object({
    role: z.enum(["default", "backup"]),
  })
  .strict()

const updateMethodSchema = z
  .object({
    methodType: z.string().min(1).optional(),
    expiryMonth: z.number().int().min(1).max(12).nullable().optional(),
    expiryYear: z.number().int().min(new Date().getUTCFullYear()).max(2200).nullable().optional(),
    status: z.enum(["active", "disabled"]).optional(),
    setAsDefault: z.boolean().optional(),
    setAsBackup: z.boolean().optional(),
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

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const method = await getCustomerPaymentMethodReference({
    customerId: access.sessionUser.userId,
    paymentMethodRefId: params.id,
  })

  if (!method) {
    return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
  }

  return respondSuccess(request, method)
}

export async function PUT(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
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
  const parsed = updateMethodSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PAYMENT_METHOD_UPDATE", message: "Invalid payment method update payload" }, { status: 400 })
  }

  const updated = await updateCustomerPaymentMethodReference({
    customerId: access.sessionUser.userId,
    paymentMethodRefId: params.id,
    ...parsed.data,
  })

  if (!updated) {
    return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
  }

  await emitPaymentLifecycleEvent({
    eventType: updated.status === "disabled" ? "payment_method_expired" : "payment_method_updated",
    userId: access.sessionUser.userId,
    customerId: access.sessionUser.userId,
    source: "api.payment.profile.methods.put",
    metadata: {
      paymentMethodLast4: updated.last4,
      reason: updated.status === "disabled" ? "marked_disabled" : "updated",
    },
  })

  return respondSuccess(request, updated)
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
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

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
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

  await emitPaymentLifecycleEvent({
    eventType: "payment_method_expired",
    userId: access.sessionUser.userId,
    customerId: access.sessionUser.userId,
    source: "api.payment.profile.methods.delete",
    metadata: {
      reason: "removed",
    },
  })

  return respondSuccess(request, { removed: true })
}
