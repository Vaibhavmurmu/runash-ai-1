// Create a Stripe Billing Portal Session
import { type NextRequest, NextResponse } from "next/server"
import { getAuthorizedBillingIdentity, requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"

export async function POST(req: NextRequest) {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return auth.unauthorizedResponse
  }

  const roleResponse = requireScopedRole(auth.sessionUser, "business")
  if (roleResponse) return roleResponse

  try {
    const { return_url } = await req.json()
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    if (!return_url) {
      return NextResponse.json({ error: "Missing required fields: return_url" }, { status: 400 })
    }

    const identity = await getAuthorizedBillingIdentity(auth.sessionUser)
    if ("errorResponse" in identity) {
      return identity.errorResponse
    }

    if (!identity.user.stripe_customer_id) {
      return NextResponse.json({ error: "Billing customer not found" }, { status: 404 })
    }

    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

    const portal = await stripe.billingPortal.sessions.create({
      customer: identity.user.stripe_customer_id,
      return_url,
    })

    await logPrivilegedAction({
      actorUserId: auth.sessionUser.userId,
      action: "billing.portal.session_created",
      resource: "billing.portal",
      request: req,
      details: { hasCustomer: true },
    })

    return NextResponse.json({ url: portal.url })
  } catch {
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
