import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireScopedBillingAccess } from "@/lib/billing-auth"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const { priceId, mode = "subscription", success_url, cancel_url } = await request.json()

    if (!process.env.STRIPE_SECRET_KEY) {
      return respondError(request, { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" }, { status: 500 })
    }

    if (!priceId || !success_url || !cancel_url) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required fields: priceId, success_url, cancel_url" }, { status: 400 })
    }

    const identity = await getAuthorizedBillingIdentity(sessionUser)
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
      customer_email: sessionUser.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        user_id: sessionUser.userId,
        organization_id: sessionUser.organizationId ? String(sessionUser.organizationId) : "",
      },
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.checkout.session_created",
      resource: "billing.checkout",
      request,
      details: { mode, hasCustomer: Boolean(identity.user.stripe_customer_id), priceId },
    })

    return respondSuccess(request, { url: session.url })
  } catch {
    return respondError(request, { code: "BILLING_CHECKOUT_CREATE_FAILED", message: "Failed to create checkout session" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
