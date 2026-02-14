import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Database } from "@/lib/database"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { immediately = false } = await req.json().catch(() => ({ immediately: false }))

    const subscriptions = await Database.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due') ORDER BY created_at DESC LIMIT 1`,
      [session.user.id],
    )

    const currentSub = subscriptions[0]
    if (!currentSub) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
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

    return NextResponse.json({ subscription: { ...updated[0], plan: plans[0] || null } })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
