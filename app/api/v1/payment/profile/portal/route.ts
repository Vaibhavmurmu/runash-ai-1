import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { getCustomerCheckoutProfile, upsertCustomerCheckoutProfile } from "@/services/payment-checkout-profile-service"

const portalProfileSchema = z
  .object({
    billingDetails: z.record(z.unknown()).nullable().optional(),
    billingAddress: z.record(z.unknown()).nullable().optional(),
    shippingAddress: z.record(z.unknown()).nullable().optional(),
    defaultPaymentMethodId: z.string().min(1).nullable().optional(),
    backupPaymentMethodId: z.string().min(1).nullable().optional(),
    redirectUrl: z.string().url().nullable().optional(),
    returnUrlSuccess: z.string().url().nullable().optional(),
    returnUrlPending: z.string().url().nullable().optional(),
    returnUrlFailed: z.string().url().nullable().optional(),
    providerTransactionReference: z.string().min(1).nullable().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const profile = await getCustomerCheckoutProfile(access.sessionUser.userId)
  return respondSuccess(request, profile)
}

export async function PUT(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = portalProfileSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PORTAL_PROFILE_PAYLOAD", message: "Invalid customer portal payload" }, { status: 400 })
  }

  const profile = await upsertCustomerCheckoutProfile({ customerId: access.sessionUser.userId, ...parsed.data })
  return respondSuccess(request, profile)
}
