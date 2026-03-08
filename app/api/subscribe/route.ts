import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createEmailSubscription, normalizeSubscriptionEmail } from "@/lib/repositories/email-subscriptions"

const SUBSCRIBE_ROUTE = "/api/subscribe"

function hashUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null
  }

  return createHash("sha256").update(userAgent).digest("hex")
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = normalizeSubscriptionEmail(body?.email)

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 })
  }

  const campaign = typeof body?.campaign === "string" ? body.campaign.trim() || null : null
  const initialStatus = body?.doubleOptIn === false ? "confirmed" : "pending"

  const subscription = await createEmailSubscription({
    email,
    sourceRoute: SUBSCRIBE_ROUTE,
    sourceCampaign: campaign,
    userAgentHash: hashUserAgent(request.headers.get("user-agent")),
    status: initialStatus,
  })

  const responseBody = {
    ok: true,
    status: subscription.createdNew ? "subscribed" : "already_subscribed",
    subscription: {
      email: subscription.record.email,
      subscriptionStatus: subscription.record.status,
      createdAt: subscription.record.createdAt,
      confirmedAt: subscription.record.confirmedAt,
      unsubscribedAt: subscription.record.unsubscribedAt,
    },
  }

  return NextResponse.json(responseBody, { status: subscription.createdNew ? 201 : 200 })
}
