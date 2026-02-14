// Create a Stripe Checkout Session for subscriptions
import { type NextRequest, NextResponse } from "next/server"
import { requireBillingSession, getAuthorizedBillingIdentity, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

export async function POST(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "startup")
  if (roleResponse) return roleResponse

  try {
    const { priceId, mode = "subscription", success_url, cancel_url } = await req.json()

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }
    if (!priceId || !success_url || !cancel_url) {
      return NextResponse.json({ error: "Missing required fields: priceId, success_url, cancel_url" }, { status: 400 })
    }

    const identity = await getAuthorizedBillingIdentity(auth.sessionUser)
    if ("errorResponse" in identity) {
      return identity.errorResponse
    }

    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

    const session = await stripe.checkout.sessions.create({
      mode,
      success_url,
      cancel_url,
      customer: identity.user.stripe_customer_id || undefined,
      customer_email: auth.sessionUser.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        user_id: auth.sessionUser.userId,
        organization_id: auth.sessionUser.organizationId ? String(auth.sessionUser.organizationId) : "",
      },
    })

    await logPrivilegedAction({
      actorUserId: auth.sessionUser.userId,
      action: "billing.checkout.session_created",
      resource: "billing.checkout",
      request: req,
      details: { mode, hasCustomer: Boolean(identity.user.stripe_customer_id), priceId },
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
