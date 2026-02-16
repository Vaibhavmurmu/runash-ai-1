import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireScopedBillingAccess } from "@/lib/billing-auth"
import { computeTaxForRegion, persistTaxComputation } from "@/lib/services/tax-service"

const createCheckoutSchema = z
  .object({
    priceId: z.string().min(1),
    mode: z.enum(["payment", "subscription"]).default("subscription"),
    success_url: z.string().url(),
    cancel_url: z.string().url(),
    product_tax_code: z.enum(["physical_goods", "digital_services", "professional_services"]).optional(),
    billing_address: z
      .object({
        country: z.string().min(2).max(2).optional(),
        state: z.string().min(1).max(16).optional(),
        city: z.string().min(1).max(96).optional(),
        postal_code: z.string().min(1).max(16).optional(),
      })
      .optional(),
  })
  .strict()

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const payload = await request.json().catch(() => ({}))
    const validation = createCheckoutSchema.safeParse(payload)
    if (!validation.success) {
      return respondError(request, { code: "INVALID_CHECKOUT_PAYLOAD", message: "Invalid checkout payload" }, { status: 400 })
    }

    const { priceId, mode, success_url, cancel_url, product_tax_code, billing_address } = validation.data

    if (!process.env.STRIPE_SECRET_KEY) {
      return respondError(request, { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" }, { status: 500 })
    }

    const identity = await getAuthorizedBillingIdentity(sessionUser)
    if ("errorResponse" in identity) {
      return identity.errorResponse
    }

    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

    const price = await stripe.prices.retrieve(priceId)
    const amount = Number(price.unit_amount ?? 0) / 100
    const taxComputation = await computeTaxForRegion({
      amount,
      currency: String(price.currency || "usd").toUpperCase(),
      productTaxCode: product_tax_code,
      address: {
        country: billing_address?.country,
        state: billing_address?.state,
        city: billing_address?.city,
        postalCode: billing_address?.postal_code,
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode,
      success_url,
      cancel_url,
      customer: identity.user.stripe_customer_id || undefined,
      customer_email: sessionUser.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        user_id: sessionUser.userId,
        organization_id: sessionUser.organizationId ? String(sessionUser.organizationId) : "",
        tax_country_code: taxComputation.countryCode,
        tax_state_code: taxComputation.stateCode ?? "",
        tax_total_amount: String(taxComputation.totalTaxAmount),
        product_tax_code: product_tax_code ?? "digital_services",
      },
    })

    await persistTaxComputation({
      sourceType: "checkout",
      sourceId: session.id,
      userId: Number(sessionUser.userId),
      currency: String(price.currency || "usd").toUpperCase(),
      computation: taxComputation,
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.checkout.session_created",
      resource: "billing.checkout",
      request,
      details: { mode, hasCustomer: Boolean(identity.user.stripe_customer_id), priceId },
    })

    return respondSuccess(request, {
      url: session.url,
      tax: {
        country_code: taxComputation.countryCode,
        state_code: taxComputation.stateCode,
        taxable_amount: taxComputation.taxableAmount,
        total_tax_amount: taxComputation.totalTaxAmount,
        total_amount: taxComputation.totalAmount,
        jurisdiction_details: taxComputation.jurisdictionDetails,
        line_items: taxComputation.lineItems,
      },
    })
  } catch {
    return respondError(request, { code: "BILLING_CHECKOUT_CREATE_FAILED", message: "Failed to create checkout session" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
