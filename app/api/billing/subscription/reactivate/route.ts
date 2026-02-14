import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Database } from "@/lib/database"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscriptions = await Database.query(
      `
      SELECT *
      FROM user_subscriptions
      WHERE user_id = $1 AND cancel_at_period_end = true AND status IN ('active', 'trialing', 'past_due')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [session.user.id],
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

    return NextResponse.json({ subscription: { ...updated[0], plan: plans[0] || null } })
  } catch (error) {
    console.error("Reactivate subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
