import { type NextRequest, NextResponse } from "next/server"

import { getServerSession } from "next-auth"
import Stripe from "stripe"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { Database } from "@/lib/database"

import { Database } from "@/lib/database"
import Stripe from "stripe"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})


const cancelSubscriptionSchema = z
  .object({
    immediately: z.boolean().optional().default(false),
    confirm: z.literal(true),
  })
  .strict()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await req.json().catch(() => ({}))
    const validation = cancelSubscriptionSchema.safeParse(payload)

    if (!validation.success) {
      return NextResponse.json({ error: "Explicit confirmation required" }, { status: 400 })
    }

    const { immediately } = validation.data

    const currentSub = await Database.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due') ORDER BY created_at DESC LIMIT 1`,
      [session.user.id],
    )

    if (!currentSub[0]) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    if (currentSub[0].stripe_subscription_id) {
      if (immediately) {
        await stripe.subscriptions.cancel(currentSub[0].stripe_subscription_id)
      } else {
        await stripe.subscriptions.update(currentSub[0].stripe_subscription_id, {

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
    const { immediately = false } = await req.json().catch(() => ({ immediately: false }))

    const subscriptions = await Database.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due') ORDER BY created_at DESC LIMIT 1`,
      [sessionUser.userId],
    )

    const currentSub = subscriptions[0]
    if (!currentSub) {
      return NextResponse.json({ error: "No active subscription found", requestId }, { status: 404, ...withRequestHeaders(requestId) })
    }

    if (currentSub.stripe_subscription_id) {
      if (immediately) {
        await stripe.subscriptions.cancel(currentSub.stripe_subscription_id)
      } else {
        await stripe.subscriptions.update(currentSub.stripe_subscription_id, {

          cancel_at_period_end: true,
        })
      }
    }


    const updatedSub = await Database.query(
      immediately
        ? `UPDATE user_subscriptions
           SET status = 'canceled', cancel_at_period_end = false, canceled_at = NOW(), ended_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`
        : `UPDATE user_subscriptions
           SET cancel_at_period_end = true, canceled_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
      [currentSub[0].id],
    )

    return NextResponse.json(updatedSub[0])
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })

    const updated = await Database.query(
      `
      UPDATE user_subscriptions
      SET
        status = CASE WHEN $1::boolean THEN 'canceled' ELSE status END,
        cancel_at_period_end = true,
        canceled_at = NOW(),
        ended_at = CASE WHEN $1::boolean THEN NOW() ELSE ended_at END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [immediately, currentSub.id],
    )

    const plans = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 LIMIT 1`, [updated[0].plan_id])

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.subscription.cancelled",
      resource: "billing.subscription",
      request: req,
      details: { immediately, subscriptionId: currentSub.id },
    })

    return NextResponse.json({ requestId, subscription: { ...updated[0], plan: plans[0] || null } }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(req, "billing.subscription.cancel_failed", error, {
      errorCode: "BILLING_SUBSCRIPTION_CANCEL_FAILED",
      requestId,
      userId: sessionUser.userId,
    })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })

  }
}
      
