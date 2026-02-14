import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import Stripe from "stripe"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

function withRequestHeaders(requestId: string) {
  return {
    headers: {
      "x-request-id": requestId,
      "x-correlation-id": requestId,
    },
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? req.headers.get("x-correlation-id") ?? crypto.randomUUID()
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
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
      return NextResponse.json({ error: "No canceling subscription found", requestId }, { status: 404, ...withRequestHeaders(requestId) })
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

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.reactivated",
      resource: "billing.subscription",
      request: req,
      details: { subscriptionId: currentSub.id },
    })

    return NextResponse.json({ requestId, subscription: { ...updated[0], plan: plans[0] || null } }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(req, "billing.subscription.reactivate_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_REACTIVATE_FAILED",
      requestId,
      userId: sessionUser.userId,
    })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
