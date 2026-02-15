import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { getCustomerCheckoutProfile, upsertCustomerCheckoutProfile } from "@/services/payment-checkout-profile-service"

const profileUpsertSchema = z
  .object({
    billingAddress: z.record(z.unknown()).nullable().optional(),
    shippingAddress: z.record(z.unknown()).nullable().optional(),
    defaultPaymentMethodId: z.string().min(1).nullable().optional(),
    backupPaymentMethodId: z.string().min(1).nullable().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const profile = await getCustomerCheckoutProfile(access.sessionUser.userId)
  return respondSuccess(request, profile)
}

export async function PUT(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = profileUpsertSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PROFILE_PAYLOAD", message: "Invalid customer profile payload" }, { status: 400 })
  }

  const profile = await upsertCustomerCheckoutProfile({
    customerId: access.sessionUser.userId,
    ...parsed.data,
  })

  return respondSuccess(request, profile)
}
