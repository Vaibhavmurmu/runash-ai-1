import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import Stripe from "stripe"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "business")
  if (roleResponse) return roleResponse

  try {
    const subscriptions = await Database.query(
      `
      SELECT *
      FROM user_subscriptions
      WHERE user_id = $1 AND cancel_at_period_end = true AND status IN ('active', 'trialing', 'past_due')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [auth.sessionUser.userId],
    )

    const currentSub = subscriptions[0]
    if (!currentSub) {
      return NextResponse.json({ error: "No canceling subscription found" }, { status: 404 })
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
      actorUserId: auth.sessionUser.userId,
      action: "billing.subscription.reactivated",
      resource: "billing.subscription",
      details: { subscriptionId: currentSub.id },
    })

    return NextResponse.json({ subscription: { ...updated[0], plan: plans[0] || null } })
  } catch (error) {
    console.error("Reactivate subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
