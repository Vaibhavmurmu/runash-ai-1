import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { removeCustomerPaymentMethodReference, switchCustomerPaymentMethod } from "@/services/payment-checkout-profile-service"

const switchMethodSchema = z
  .object({
    role: z.enum(["default", "backup"]),
  })
  .strict()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

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
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const removed = await removeCustomerPaymentMethodReference({
    customerId: access.sessionUser.userId,
    paymentMethodRefId: params.id,
  })

  if (!removed) {
    return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
  }

  return respondSuccess(request, { removed: true })
}
