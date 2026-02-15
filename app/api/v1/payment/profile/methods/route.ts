import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import {
  addCustomerPaymentMethodReference,
  listCustomerPaymentMethodReferences,
} from "@/services/payment-checkout-profile-service"

const addMethodSchema = z
  .object({
    provider: z.string().min(1),
    providerTokenId: z.string().min(1),
    methodType: z.string().min(1),
    last4: z.string().length(4).nullable().optional(),
    expiryMonth: z.number().int().min(1).max(12).nullable().optional(),
    expiryYear: z.number().int().min(new Date().getUTCFullYear()).max(2200).nullable().optional(),
    setAsDefault: z.boolean().optional(),
    setAsBackup: z.boolean().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const refs = await listCustomerPaymentMethodReferences(access.sessionUser.userId)
  return respondSuccess(request, refs)
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = addMethodSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PAYMENT_METHOD_PAYLOAD", message: "Invalid payment method payload" }, { status: 400 })
  }

  try {
    const created = await addCustomerPaymentMethodReference({
      customerId: access.sessionUser.userId,
      payload: body,
      ...parsed.data,
    })

    return respondSuccess(request, created, { status: 201 })
  } catch {
    return respondError(
      request,
      {
        code: "PAYMENT_METHOD_TOKENIZATION_REQUIRED",
        message: "Only tokenized provider identifiers are accepted for payment methods.",
      },
      { status: 400 },
    )
  }
}
