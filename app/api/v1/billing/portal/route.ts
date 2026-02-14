import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { getAuthorizedBillingIdentity, requireScopedBillingAccess } from "@/lib/billing-auth"

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const { return_url } = await request.json()
    if (!process.env.STRIPE_SECRET_KEY) {
      return respondError(request, { code: "STRIPE_NOT_CONFIGURED", message: "Stripe not configured" }, { status: 500 })
    }

    if (!return_url) {
      return respondError(request, { code: "MISSING_REQUIRED_FIELDS", message: "Missing required fields: return_url" }, { status: 400 })
    }

    const identity = await getAuthorizedBillingIdentity(sessionUser)
    if ("errorResponse" in identity) return identity.errorResponse

    if (!identity.user.stripe_customer_id) {
      return respondError(request, { code: "BILLING_CUSTOMER_NOT_FOUND", message: "Billing customer not found" }, { status: 404 })
    }

    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

    const portal = await stripe.billingPortal.sessions.create({
      customer: identity.user.stripe_customer_id,
      return_url,
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "billing.portal.session_created",
      resource: "billing.portal",
      request,
      details: { hasCustomer: true },
    })

    return respondSuccess(request, { url: portal.url })
  } catch {
    return respondError(request, { code: "BILLING_PORTAL_CREATE_FAILED", message: "Failed to create portal session" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
