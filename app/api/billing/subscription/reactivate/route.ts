import { type NextRequest } from "next/server"
import Stripe from "stripe"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"
import { emitPaymentLifecycleEvent } from "@/lib/services/payment-lifecycle-events"
import { createPaymentRoutingAuditEvent, resolveEdgeRoutingPolicy } from "@/lib/payments/edge-routing-policy"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const edgeRouting = resolveEdgeRoutingPolicy({
      merchantRegion: process.env.RUNASH_MERCHANT_REGION,
      customerRegion: undefined,
    })
    const routeAudit = createPaymentRoutingAuditEvent({
      requestId: request.headers.get("x-request-id"),
      decision: edgeRouting,
      metadata: { route_scope: "billing.subscription.reactivate" },
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.route_decision",
      resource: "billing.subscription",
      request,
      details: routeAudit,
    })

    const subscriptions = await Database.query(
      `
      SELECT *
      FROM user_subscriptions
      WHERE user_id = $1 AND cancel_at_period_end = true AND status IN ('active', 'trialing', 'past_due')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [sessionUser.userId],
    )

    const currentSub = subscriptions[0]
    if (!currentSub) {
      return respondError(
        request,
        { code: "SUBSCRIPTION_NOT_CANCELING", message: "No canceling subscription found" },
        { status: 404 },
      )
    }

    if (currentSub.stripe_subscription_id) {
      await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
        cancel_at_period_end: false,
      })
    }

    const updated = await Database.query(
      `
      UPDATE user_subscriptions
      SET cancel_at_period_end = false, canceled_at = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [currentSub.id],
    )

    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 LIMIT 1`, [updated[0].plan_id])
    const subscription = { ...updated[0], plan: plans[0] || null }

    await emitPaymentLifecycleEvent({
      eventType: "subscription_started",
      userId: sessionUser.userId,
      subscriptionId: currentSub.stripe_subscription_id ? String(currentSub.stripe_subscription_id) : String(currentSub.id),
      source: "api.billing.subscription.reactivate",
      metadata: {
        plan: updated[0]?.plan_id ? String(updated[0].plan_id) : null,
        nextBillingDate: updated[0]?.current_period_end ? new Date(updated[0].current_period_end).toISOString() : null,
        reason: "reactivated",
      },
    })


    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.reactivated",
      resource: "billing.subscription",
      request,
      details: { subscriptionId: currentSub.id, requestId: routeAudit.requestId, routeDecision: routeAudit.routeDecision },
    })

    return respondSuccess(
      request,
      { subscription },
      {
        legacy: { subscription },
      },
    )
  } catch (error) {
    logApiRouteError(request, "billing.subscription.reactivate_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_REACTIVATE_FAILED",
      userId: sessionUser.userId,
    })
    return respondError(request, { code: "BILLING_SUBSCRIPTION_REACTIVATE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
