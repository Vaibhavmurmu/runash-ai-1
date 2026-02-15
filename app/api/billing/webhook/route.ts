import { type NextRequest, NextResponse } from "next/server"
import { logApiEvent, createRequestLogContext } from "@/lib/api/logging"
import { getWebhookEventByEventId, processWebhookEvent, recordWebhookEvent } from "@/lib/services/billing-webhook-service"

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300

export async function POST(req: NextRequest) {
  const requestContext = createRequestLogContext(req)
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    logApiEvent("error", "billing.webhook.secret_missing", {
      ...requestContext,
      details: { hasSecret: false },
    })
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    logApiEvent("warn", "billing.webhook.signature_missing", requestContext)
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  const raw = await req.text()
  const { default: Stripe } = await import("stripe")
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "sk_webhook_placeholder", {
    apiVersion: "2026-01-28.clover",
  })

  let event: { id: string; type: string; created?: number; data?: { object?: any } }
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret, DEFAULT_SIGNATURE_TOLERANCE_SECONDS)
  } catch (error) {
    logApiEvent("warn", "billing.webhook.signature_invalid", {
      ...requestContext,
      error,
      details: { signaturePresent: true },
    })
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  const eventRecord = await recordWebhookEvent(event)
  if (eventRecord.duplicate) {
    const existing = await getWebhookEventByEventId(event.id)
    logApiEvent("info", "billing.webhook.duplicate_ignored", {
      ...requestContext,
      details: { eventId: event.id, eventType: event.type, status: existing?.status ?? "unknown" },
    })
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const result = await processWebhookEvent(event)
    logApiEvent("info", "billing.webhook.processed", {
      ...requestContext,
      details: { eventId: event.id, eventType: event.type, attempts: result.attempts },
    })
    return NextResponse.json({ received: true, processed: true })
  } catch (error) {
    logApiEvent("error", "billing.webhook.processing_failed", {
      ...requestContext,
      error,
      details: { eventId: event.id, eventType: event.type },
    })

    return NextResponse.json({ received: true, processed: false }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
