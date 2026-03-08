import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireScopedBillingAccess } from "@/lib/billing-auth"
import { createSignedCheckoutReturnState } from "@/lib/payments/checkout-return-state"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import {
  buildComplianceSafePaymentMetadata,
  createPaymentRoutingAuditEvent,
  createPaymentRoutingContextMetadata,
  resolveEdgeRoutingPolicy,
  withRouteContextMetadata,
} from "@/lib/payments/edge-routing-policy"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { computeTaxForRegion, persistTaxComputation } from "@/lib/services/tax-service"
import { upsertCustomerCheckoutProfile } from "@/services/payment-checkout-profile-service"
import { postAccountingEvent } from "@/lib/services/runashbook-accounting-service"

const createCheckoutSchema = z
  .object({
    priceId: z.string().min(1),
    mode: z.enum(["payment", "subscription"]).default("subscription"),
    success_url: z.string().url(),
    cancel_url: z.string().url(),
    redirectUrl: z.string().url().optional(),
    returnUrlSuccess: z.string().url().optional(),
    returnUrlPending: z.string().url().optional(),
    returnUrlFailed: z.string().url().optional(),
    humanConfirmed: z.boolean().optional(),
    mfaVerified: z.boolean().optional(),
    requestClientSecret: z.boolean().optional(),
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

function appendCallbackParams(url: string, params: Record<string, string>) {
  const target = new URL(url)
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value)
  }
  return target.toString()
}

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

    const {
      priceId,
      mode,
      success_url,
      cancel_url,
      redirectUrl,
      returnUrlSuccess,
      returnUrlPending,
      returnUrlFailed,
      product_tax_code,
      billing_address,
      humanConfirmed,
      mfaVerified,
      requestClientSecret,
    } = validation.data

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
    const routingContextMetadata = createPaymentRoutingContextMetadata({
      requestId: routeAudit.requestId,
      routeDecision: edgeRouting,
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
    const validatorGate = enforcePaymentValidatorMiddleware({
      amountMinor: Number(price.unit_amount ?? 0),
      currency: String(price.currency || "usd").toUpperCase(),
      humanConfirmed,
      mfaVerified,
    })
    const validatorDecision = validatorGate.decision

    if (!validatorGate.allowed) {
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
          validatorGate,
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
          meta: { validatorDecision, validatorGate },
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

    const returnBaseUrl = redirectUrl || `${request.nextUrl.origin}/payment-redirect/return`
    const normalizedReturnSuccess = returnUrlSuccess || success_url
    const normalizedReturnFailed = returnUrlFailed || cancel_url
    const normalizedReturnPending = returnUrlPending || appendCallbackParams(returnBaseUrl, { status: "pending" })

    const initialState = createSignedCheckoutReturnState({
      checkoutSessionId: "{CHECKOUT_SESSION_ID}",
      customerId: sessionUser.userId,
      providerTransactionReference: "{CHECKOUT_SESSION_ID}",
      ttlSeconds: 60 * 30,
    })

    const stripeSuccessUrl = appendCallbackParams(normalizedReturnSuccess, {
      state: initialState,
      provider_ref: "{CHECKOUT_SESSION_ID}",
      checkout_session_id: "{CHECKOUT_SESSION_ID}",
      provider: "stripe",
    })
    const stripeCancelUrl = appendCallbackParams(normalizedReturnFailed, {
      state: initialState,
      provider_ref: "{CHECKOUT_SESSION_ID}",
      checkout_session_id: "{CHECKOUT_SESSION_ID}",
      provider: "stripe",
      status: "failed",
    })

    const sessionPayload: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode,
      customer: identity.user.stripe_customer_id || undefined,
      customer_email: sessionUser.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: withRouteContextMetadata(
        buildComplianceSafePaymentMetadata({
          requestId: routingContextMetadata.requestId,
          routeDecision: edgeRouting,
          metadata: {
            user_id: sessionUser.userId,
            organization_id: sessionUser.organizationId ? String(sessionUser.organizationId) : "",
            tax_country_code: taxComputation.countryCode,
            tax_state_code: taxComputation.stateCode ?? "",
            tax_total_amount: String(taxComputation.totalTaxAmount),
            product_tax_code: product_tax_code ?? "digital_services",
            validator_decision: JSON.stringify(validatorDecision),
          },
        }),
        edgeRouting,
        routingContextMetadata,
      ),
    }

    if (requestClientSecret) {
      sessionPayload.ui_mode = "embedded"
      sessionPayload.return_url = normalizedReturnSuccess
    } else {
      sessionPayload.success_url = stripeSuccessUrl
      sessionPayload.cancel_url = stripeCancelUrl
    }

    const session = await stripe.checkout.sessions.create(sessionPayload)

    await persistTaxComputation({
      sourceType: "checkout",
      sourceId: session.id,
      userId: Number(sessionUser.userId),
      currency: String(price.currency || "usd").toUpperCase(),
      computation: taxComputation,
    })

    const signedState = createSignedCheckoutReturnState({
      checkoutSessionId: session.id,
      customerId: sessionUser.userId,
      providerTransactionReference: session.id,
    })

    const finalizedReturnUrlSuccess = appendCallbackParams(normalizedReturnSuccess, {
      state: signedState,
      provider_ref: session.id,
      checkout_session_id: session.id,
      provider: "stripe",
    })
    const finalizedReturnUrlPending = appendCallbackParams(normalizedReturnPending, {
      state: signedState,
      provider_ref: session.id,
      checkout_session_id: session.id,
      provider: "stripe",
      status: "pending",
    })
    const finalizedReturnUrlFailed = appendCallbackParams(normalizedReturnFailed, {
      state: signedState,
      provider_ref: session.id,
      checkout_session_id: session.id,
      provider: "stripe",
      status: "failed",
    })

    await upsertCustomerCheckoutProfile({
      customerId: sessionUser.userId,
      redirectUrl: session.url ?? null,
      returnUrlSuccess: finalizedReturnUrlSuccess,
      returnUrlPending: finalizedReturnUrlPending,
      returnUrlFailed: finalizedReturnUrlFailed,
      providerTransactionReference: session.id,
    })

    await postAccountingEvent({
      event: {
        eventType: "checkout_initiated",
        occurredAt: new Date().toISOString(),
        amount,
        taxAmount: taxComputation.totalTaxAmount,
        feeAmount: 0,
        currency: String(price.currency || "usd").toUpperCase(),
        merchantCountry: process.env.RUNASH_MERCHANT_REGION || taxComputation.countryCode || "US",
        merchantEntityId: sessionUser.organizationId ? String(sessionUser.organizationId) : sessionUser.userId,
        merchantId: sessionUser.userId,
        customerCountry: billing_address?.country,
        correlationKey: session.id,
        idempotencyKey: `checkout_initiated:${session.id}`,
        provider: "stripe",
        providerReference: session.id,
        metadata: {
          mode,
          source: "app.api.v1.billing.checkout",
        },
      },
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
        provider: "stripe",
      }),
    })

    return respondSuccess(request, {
      url: session.url,
      redirectUrl: session.url,
      clientSecret: session.client_secret,
      returnUrlSuccess: finalizedReturnUrlSuccess,
      returnUrlPending: finalizedReturnUrlPending,
      returnUrlFailed: finalizedReturnUrlFailed,
      providerTransactionReference: session.id,
      provider: "stripe",
      state: signedState,
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
