import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import Stripe from "stripe"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { Database } from "@/lib/database"

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
  }
}
