import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import Stripe from "stripe"
import { getAuthorizedBillingIdentity, requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

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
      [auth.sessionUser.userId],
    )

    if (!subscription[0]) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
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
    console.error("Get subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  try {
    const { plan_id, payment_method_id } = await req.json()

    const plan = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`, [plan_id])

    if (!plan[0]) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    const identity = await getAuthorizedBillingIdentity(auth.sessionUser)
    if ("errorResponse" in identity) {
      return identity.errorResponse
    }

    let stripeCustomerId = identity.user.stripe_customer_id

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: auth.sessionUser.email || undefined,
        name: auth.sessionUser.name || undefined,
        metadata: { user_id: auth.sessionUser.userId },
      })

      stripeCustomerId = stripeCustomer.id

      await Database.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [stripeCustomerId, auth.sessionUser.userId])
    }

    const subscriptionData: any = {
      customer: stripeCustomerId,
      items: [{ price: plan[0].stripe_price_id }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { user_id: auth.sessionUser.userId, plan_id },
    }

    if (payment_method_id) {
      subscriptionData.default_payment_method = payment_method_id
    }

    if (plan[0].trial_days > 0) {
      subscriptionData.trial_period_days = plan[0].trial_days
    }

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
        auth.sessionUser.userId,
        plan_id,
        stripeSubscription.id,
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      ],
    )

    const response: any = {
      subscription: { ...dbSubscription[0], plan: plan[0] },
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
      actorUserId: auth.sessionUser.userId,
      action: "billing.subscription.created",
      resource: "billing.subscription",
      request: req,
      details: { planId: plan_id, hasPaymentMethod: Boolean(payment_method_id) },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Create subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "business")
  if (roleResponse) return roleResponse

  try {
    const { plan_id, prorate = true } = await req.json()

    const currentSub = await Database.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1`,
      [auth.sessionUser.userId],
    )

    if (!currentSub[0]) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    const newPlan = await Database.query(`SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`, [plan_id])

    if (!newPlan[0]) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

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
      actorUserId: auth.sessionUser.userId,
      action: "billing.subscription.updated",
      resource: "billing.subscription",
      request: req,
      details: { oldPlanId: currentSub[0].plan_id, newPlanId: plan_id, prorate },
    })

    return NextResponse.json({ ...updatedSub[0], plan: newPlan[0] })
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
