import { type NextRequest } from "next/server"
import Stripe from "stripe"
import { z } from "zod"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireBillingActionAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"
import { computeTaxForRegion, persistTaxComputation } from "@/lib/services/tax-service"
import {
  buildComplianceSafePaymentMetadata,
  createPaymentRoutingAuditEvent,
  createPaymentRoutingContextMetadata,
  resolveEdgeRoutingPolicy,
  withRouteContextMetadata,
} from "@/lib/payments/edge-routing-policy"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const updateSubscriptionSchema = z
  .object({
    plan_id: z.string().min(1),
    prorate: z.boolean().optional().default(true),
    confirm: z.literal(true),
  })
  .strict()

function toNumericUserId(userId: string) {
  const parsed = Number(userId)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function buildStripePolicyContext(request: NextRequest, customerRegion?: string) {
  const edgeRouting = resolveEdgeRoutingPolicy({
    merchantRegion: process.env.RUNASH_MERCHANT_REGION,
    customerRegion,
  })

  const routeAudit = createPaymentRoutingAuditEvent({
    requestId: request.headers.get("x-request-id"),
    decision: edgeRouting,
    metadata: {
      route_scope: "billing.subscription",
    },
  })

  const routingContextMetadata = createPaymentRoutingContextMetadata({
    requestId: routeAudit.requestId,
    routeDecision: edgeRouting,
  })

  return { edgeRouting, routeAudit, routingContextMetadata }
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:admin")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const subscription = await Database.query(
      `
      SELECT us.*, sp.name as plan_name, sp.price, sp.currency, sp.interval, sp.features, sp.limits
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status IN ('active', 'trialing', 'past_due')
      ORDER BY us.created_at DESC
      LIMIT 1
    `,
      [sessionUser.userId],
    )

    if (!subscription[0]) {
      return respondSuccess(request, null)
    }

    return respondSuccess(request, {
      ...subscription[0],
      plan: {
        id: subscription[0].plan_id,
        name: subscription[0].plan_name,
        price: subscription[0].price,
        currency: subscription[0].currency,
        interval: subscription[0].interval,
        features: subscription[0].features,
        limits: subscription[0].limits,
      },
    })
  } catch (error) {
    logApiRouteError(request, "billing.subscription.get_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_GET_FAILED",
      userId: sessionUser.userId,
    })
    return respondError(request, { code: "BILLING_SUBSCRIPTION_GET_FAILED", message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:admin")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const payload = await request.json().catch(() => ({}))
    const { plan_id, payment_method_id, billing_address, product_tax_code } = payload as {
      plan_id?: string
      payment_method_id?: string
      billing_address?: { country?: string; state?: string; city?: string; postal_code?: string }
      product_tax_code?: "physical_goods" | "digital_services" | "professional_services"
    }

    if (!plan_id) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required field: plan_id" }, { status: 400 })
    }

    const plan = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`, [plan_id])
    if (!plan[0]) {
      return respondError(request, { code: "PLAN_NOT_FOUND", message: "Plan not found" }, { status: 404 })
    }

    const productTaxCode =
      product_tax_code ||
      (typeof plan[0].product_tax_code === "string" ? plan[0].product_tax_code : undefined) ||
      "digital_services"

    const taxComputation = await computeTaxForRegion({
      amount: Number(plan[0].price) / 100,
      currency: String(plan[0].currency || "USD").toUpperCase(),
      productTaxCode,
      address: {
        country: billing_address?.country,
        state: billing_address?.state,
        city: billing_address?.city,
        postalCode: billing_address?.postal_code,
      },
    })

    const { edgeRouting, routeAudit, routingContextMetadata } = buildStripePolicyContext(request, billing_address?.country)

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.route_decision",
      resource: "billing.subscription",
      request,
      details: routeAudit,
    })

    const identity = await getAuthorizedBillingIdentity(sessionUser)
    if ("errorResponse" in identity) return identity.errorResponse

    let stripeCustomerId = identity.user.stripe_customer_id
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: sessionUser.email || undefined,
        name: sessionUser.name || undefined,
        metadata: withRouteContextMetadata(
          buildComplianceSafePaymentMetadata({
            requestId: routingContextMetadata.requestId,
            routeDecision: edgeRouting,
            metadata: { user_id: sessionUser.userId },
          }),
          edgeRouting,
          routingContextMetadata,
        ),
      })
      stripeCustomerId = stripeCustomer.id
      await Database.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [stripeCustomerId, sessionUser.userId])
    }

    const subscriptionData: any = {
      customer: stripeCustomerId,
      items: [{ price: plan[0].stripe_price_id }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: withRouteContextMetadata(
        buildComplianceSafePaymentMetadata({
          requestId: routingContextMetadata.requestId,
          routeDecision: edgeRouting,
          metadata: {
            user_id: sessionUser.userId,
            plan_id,
            tax_country_code: taxComputation.countryCode,
            tax_state_code: taxComputation.stateCode ?? "",
            tax_total_amount: String(taxComputation.totalTaxAmount),
            product_tax_code: productTaxCode,
          },
        }),
        edgeRouting,
        routingContextMetadata,
      ),
    }

    if (payment_method_id) subscriptionData.default_payment_method = payment_method_id
    if (plan[0].trial_days > 0) subscriptionData.trial_period_days = plan[0].trial_days

    const stripeSubscription = await stripe.subscriptions.create(subscriptionData)

    const dbSubscription = await Database.query(
      `
      INSERT INTO user_subscriptions (
        user_id, plan_id, stripe_subscription_id, status,
        current_period_start, current_period_end, trial_start, trial_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        sessionUser.userId,
        plan_id,
        stripeSubscription.id,
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      ],
    )

    await persistTaxComputation({
      sourceType: "subscription",
      sourceId: stripeSubscription.id,
      userId: toNumericUserId(sessionUser.userId),
      currency: String(plan[0].currency || "USD").toUpperCase(),
      computation: taxComputation,
    })

    const response: Record<string, unknown> = {
      subscription: { ...dbSubscription[0], plan: plan[0] },
      tax: {
        country_code: taxComputation.countryCode,
        state_code: taxComputation.stateCode,
        taxable_amount: taxComputation.taxableAmount,
        total_tax_amount: taxComputation.totalTaxAmount,
        total_amount: taxComputation.totalAmount,
        jurisdiction_details: taxComputation.jurisdictionDetails,
        line_items: taxComputation.lineItems,
      },
    }

    if (stripeSubscription.latest_invoice && typeof stripeSubscription.latest_invoice === "object") {
      const invoice = stripeSubscription.latest_invoice
      if (invoice.payment_intent && typeof invoice.payment_intent === "object") {
        const paymentIntent = invoice.payment_intent
        if (paymentIntent.status === "requires_action") {
          response.client_secret = paymentIntent.client_secret
          response.requires_action = true
        }
      }
    }

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.created",
      resource: "billing.subscription",
      request,
      details: {
        planId: plan_id,
        hasPaymentMethod: Boolean(payment_method_id),
        taxCountryCode: taxComputation.countryCode,
        taxStateCode: taxComputation.stateCode,
        productTaxCode,
        requestId: routeAudit.requestId,
        routeDecision: routeAudit.routeDecision,
      },
    })

    return respondSuccess(request, response)
  } catch (error) {
    logApiRouteError(request, "billing.subscription.create_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_CREATE_FAILED",
      userId: sessionUser.userId,
    })
    return respondError(request, { code: "BILLING_SUBSCRIPTION_CREATE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:admin")
  if ("response" in access) return access.response
  const { sessionUser } = access

  const payload = await request.json().catch(() => ({}))
  const validation = updateSubscriptionSchema.safeParse(payload)
  if (!validation.success) {
    return respondError(request, { code: "EXPLICIT_CONFIRMATION_REQUIRED", message: "Explicit confirmation required" }, { status: 400 })
  }

  const { plan_id, prorate } = validation.data

  try {
    const currentSub = await Database.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1`,
      [sessionUser.userId],
    )

    if (!currentSub[0]) {
      return respondError(request, { code: "SUBSCRIPTION_NOT_FOUND", message: "No active subscription found" }, { status: 404 })
    }

    const newPlan = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`, [plan_id])
    if (!newPlan[0]) {
      return respondError(request, { code: "PLAN_NOT_FOUND", message: "Plan not found" }, { status: 404 })
    }

    const { routeAudit } = buildStripePolicyContext(request)

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.route_decision",
      resource: "billing.subscription",
      request,
      details: routeAudit,
    })

    await stripe.subscriptions.update(currentSub[0].stripe_subscription_id, {
      items: [
        {
          id: (await stripe.subscriptions.retrieve(currentSub[0].stripe_subscription_id)).items.data[0].id,
          price: newPlan[0].stripe_price_id,
        },
      ],
      proration_behavior: prorate ? "create_prorations" : "none",
    })

    const updatedSub = await Database.query(
      `UPDATE user_subscriptions SET plan_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [plan_id, currentSub[0].id],
    )

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.updated",
      resource: "billing.subscription",
      request,
      details: { oldPlanId: currentSub[0].plan_id, newPlanId: plan_id, prorate, requestId: routeAudit.requestId, routeDecision: routeAudit.routeDecision },
    })

    return respondSuccess(request, { ...updatedSub[0], plan: newPlan[0] })
  } catch (error) {
    logApiRouteError(request, "billing.subscription.update_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_UPDATE_FAILED",
      userId: sessionUser.userId,
    })
    return respondError(request, { code: "BILLING_SUBSCRIPTION_UPDATE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
