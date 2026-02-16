import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireScopedBillingAccess } from "@/lib/billing-auth"
import { computeTaxForRegion, persistTaxComputation } from "@/lib/services/tax-service"
import { evaluatePaymentValidatorGate } from "@/lib/payments/validator-gate"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import {
  createPaymentRoutingAuditEvent,
  resolveEdgeRoutingPolicy,
  withRouteContextMetadata,
} from "@/lib/payments/edge-routing-policy"

const createCheckoutSchema = z
  .object({
    priceId: z.string().min(1),
    mode: z.enum(["payment", "subscription"]).default("subscription"),
    success_url: z.string().url(),
    cancel_url: z.string().url(),
    humanConfirmed: z.boolean().optional(),
    mfaVerified: z.boolean().optional(),
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

    const { priceId, mode, success_url, cancel_url, product_tax_code, billing_address, humanConfirmed, mfaVerified } =
      validation.data

    if (!process.env.STRIPE_SECRET_KEY) {
      return respondError(request, { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" }, { status: 500 })
    }

    const identity = await getAuthorizedBillingIdentity(sessionUser)
    if ("errorResponse" in identity) {
      return identity.errorResponse
    }

    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

    const edgeRouting = resolveEdgeRoutingPolicy({
      merchantRegion: process.env.RUNASH_MERCHANT_REGION,
      customerRegion: billing_address?.country,
    })
    const routeAudit = createPaymentRoutingAuditEvent({
      requestId: request.headers.get("x-request-id"),
      decision: edgeRouting,
      metadata: {
        route_scope: "billing.checkout",
        mode,
        currency_hint: priceId,
      },
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.checkout.route_decision",
      resource: "billing.checkout",
      request,
      details: routeAudit,
    })

    const price = await stripe.prices.retrieve(priceId)
    const amount = Number(price.unit_amount ?? 0) / 100
    const validatorDecision = evaluatePaymentValidatorGate({
      amountMinor: Number(price.unit_amount ?? 0),
      currency: String(price.currency || "usd").toUpperCase(),
      humanConfirmed,
      mfaVerified,
    })

    if (!validatorDecision.allowed) {
      await logPrivilegedAction({
        actorUserId: sessionUser.userId,
        action: "billing.checkout.validator_blocked",
        resource: "billing.checkout",
        request,
        details: sanitizePaymentActivityDetails({
          priceId,
          mode,
          currency: String(price.currency || "usd").toUpperCase(),
          unitAmount: Number(price.unit_amount ?? 0),
          validatorDecision,
        }),
      })

      return respondError(
        request,
        {
          code: "BILLING_CHECKOUT_VALIDATOR_BLOCKED",
          message: "Checkout blocked pending additional verification",
        },
        {
          status: 403,
          meta: { validatorDecision },
        },
      )
    }

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
      metadata: withRouteContextMetadata(
        {
          user_id: sessionUser.userId,
          organization_id: sessionUser.organizationId ? String(sessionUser.organizationId) : "",
          tax_country_code: taxComputation.countryCode,
          tax_state_code: taxComputation.stateCode ?? "",
          tax_total_amount: String(taxComputation.totalTaxAmount),
          product_tax_code: product_tax_code ?? "digital_services",
          validator_decision: JSON.stringify(validatorDecision),
        },
        edgeRouting,
      ),
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
      details: sanitizePaymentActivityDetails({
        mode,
        hasCustomer: Boolean(identity.user.stripe_customer_id),
        priceId,
        validatorDecision,
        requestId: routeAudit.requestId,
        routeDecision: routeAudit.routeDecision,
      }),
    })

    return respondSuccess(request, {
      url: session.url,
      validatorDecision,
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
