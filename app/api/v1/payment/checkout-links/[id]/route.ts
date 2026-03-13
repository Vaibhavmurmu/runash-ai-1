import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { transitionCheckoutLinkStatus, updateCheckoutLink } from "@/services/payment-checkout-profile-service"

const updateCheckoutLinkSchema = z
  .object({
    amountMin: z.number().positive().nullable().optional(),
    amountMax: z.number().positive().nullable().optional(),
    fixedAmount: z.number().positive().nullable().optional(),
    currency: z.string().min(3).max(3).optional(),
    productMetadata: z.record(z.unknown()).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(["draft", "active", "expired", "disabled"]).optional(),
  })
  .strict()

const actionSchema = z
  .object({
    action: z.enum(["disable", "expire"]),
  })
  .strict()

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const actionParsed = actionSchema.safeParse(body)
  if (actionParsed.success) {
    const changed = await transitionCheckoutLinkStatus({
      ownerUserId: access.sessionUser.userId,
      id: params.id,
      action: actionParsed.data.action,
    })

    if (!changed) {
      return respondError(request, { code: "CHECKOUT_LINK_NOT_FOUND", message: "Checkout link not found" }, { status: 404 })
    }

    return respondSuccess(request, changed)
  }

  const parsed = updateCheckoutLinkSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_CHECKOUT_LINK_UPDATE", message: "Invalid checkout link update payload" }, { status: 400 })
  }

  const hasFixed = parsed.data.fixedAmount != null
  const hasRules = parsed.data.amountMin != null || parsed.data.amountMax != null
  if (hasFixed && hasRules) {
    return respondError(
      request,
      { code: "INVALID_AMOUNT_RULES", message: "Use either fixedAmount or amount range rules, but not both." },
      { status: 400 },
    )
  }

  const record = await updateCheckoutLink({ ownerUserId: access.sessionUser.userId, id: params.id, ...parsed.data })
  if (!record) {
    return respondError(request, { code: "CHECKOUT_LINK_NOT_FOUND", message: "Checkout link not found" }, { status: 404 })
  }

  return respondSuccess(request, record)
}
