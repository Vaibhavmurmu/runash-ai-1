import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { getCustomerCheckoutProfile, upsertCustomerCheckoutProfile } from "@/services/payment-checkout-profile-service"

const billingDetailsSchema = z
  .object({
    billingDetails: z.record(z.unknown()).nullable(),
    billingAddress: z.record(z.unknown()).nullable().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const profile = await getCustomerCheckoutProfile(access.sessionUser.userId)
  return respondSuccess(request, {
    billingDetails: profile.billingDetails,
    billingAddress: profile.billingAddress,
  })
}

export async function PUT(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, { customerId: access.sessionUser.userId, organizationId: access.sessionUser.organizationId })
  if (scopeError) return scopeError

  const body = await request.json().catch(() => ({}))
  const parsed = billingDetailsSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "INVALID_BILLING_DETAILS_PAYLOAD", message: "Invalid billing details payload" }, { status: 400 })
  }

  const profile = await upsertCustomerCheckoutProfile({ customerId: access.sessionUser.userId, ...parsed.data })

  return respondSuccess(request, {
    billingDetails: profile.billingDetails,
    billingAddress: profile.billingAddress,
    updatedAt: profile.updatedAt,
  })
}
