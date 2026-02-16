import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import {
  getCustomerBillingHistoryWithRetries,
  getCustomerCheckoutProfile,
  switchCustomerPaymentMethod,
} from "@/services/payment-checkout-profile-service"

const updateControlsSchema = z
  .object({
    defaultPaymentMethodId: z.string().min(1).optional(),
    backupPaymentMethodId: z.string().min(1).optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(250, limitParam)) : 50

  const [profile, billingHistory] = await Promise.all([
    getCustomerCheckoutProfile(access.sessionUser.userId),
    getCustomerBillingHistoryWithRetries(access.sessionUser.userId, limit),
  ])

  return respondSuccess(request, {
    defaultPaymentMethodId: profile.defaultPaymentMethodId,
    backupPaymentMethodId: profile.backupPaymentMethodId,
    billingHistory,
  })
}

export async function PUT(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const body = await request.json().catch(() => ({}))
  const parsed = updateControlsSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PROFILE_CONTROLS_PAYLOAD", message: "Invalid customer profile controls payload" }, { status: 400 })
  }

  let updatedProfile = await getCustomerCheckoutProfile(access.sessionUser.userId)

  if (parsed.data.defaultPaymentMethodId) {
    const switched = await switchCustomerPaymentMethod({
      customerId: access.sessionUser.userId,
      paymentMethodRefId: parsed.data.defaultPaymentMethodId,
      role: "default",
    })

    if (!switched) {
      return respondError(request, { code: "DEFAULT_PAYMENT_METHOD_NOT_FOUND", message: "Default payment method reference not found" }, { status: 404 })
    }

    updatedProfile = switched
  }

  if (parsed.data.backupPaymentMethodId) {
    const switched = await switchCustomerPaymentMethod({
      customerId: access.sessionUser.userId,
      paymentMethodRefId: parsed.data.backupPaymentMethodId,
      role: "backup",
    })

    if (!switched) {
      return respondError(request, { code: "BACKUP_PAYMENT_METHOD_NOT_FOUND", message: "Backup payment method reference not found" }, { status: 404 })
    }

    updatedProfile = switched
  }

  return respondSuccess(request, {
    defaultPaymentMethodId: updatedProfile.defaultPaymentMethodId,
    backupPaymentMethodId: updatedProfile.backupPaymentMethodId,
  })
}
