import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { createCheckoutLink, listCheckoutLinks } from "@/services/payment-checkout-profile-service"

const createCheckoutLinkSchema = z
  .object({
    slug: z.string().min(3),
    amountMin: z.number().positive().nullable().optional(),
    amountMax: z.number().positive().nullable().optional(),
    fixedAmount: z.number().positive().nullable().optional(),
    currency: z.string().min(3).max(3).default("USD"),
    productMetadata: z.record(z.unknown()).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(["draft", "active", "expired", "disabled"]).optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const records = await listCheckoutLinks(access.sessionUser.userId)
  return respondSuccess(request, records)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = createCheckoutLinkSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_CHECKOUT_LINK_PAYLOAD", message: "Invalid checkout link payload" }, { status: 400 })
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

  const record = await createCheckoutLink({ ownerUserId: access.sessionUser.userId, ...parsed.data })
  return respondSuccess(request, record, { status: 201 })
}
