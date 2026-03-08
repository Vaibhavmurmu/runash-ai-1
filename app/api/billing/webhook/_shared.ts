import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiEvent, createRequestLogContext } from "@/lib/api/logging"
import { WalletStore } from "@/lib/data/wallet-store"
import { getWebhookEventByEventId, processWebhookEvent, recordWebhookEvent } from "@/lib/services/billing-webhook-service"
import { verifyStripeSignedPayload } from "@/lib/auth/plugins/runash-payment"
import { shouldTreatDuplicateAsProcessed } from "@/lib/services/billing-webhook-idempotency"

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300

const stripeSetupIntentCallbackSchema = z
  .object({
    id: z.string().min(1),
    request: z.string().optional().nullable(),
    last_setup_error: z
      .object({
        code: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .passthrough()

function getRequiredStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured")
  }

  return secretKey
}

function getConfiguredToleranceSeconds() {
  const configured = Number(process.env.BILLING_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SIGNATURE_TOLERANCE_SECONDS
}

async function syncWalletLinkVerificationFromWebhook(event: { type: string; data?: { object?: any } }) {
  const object = event.data?.object
  if (!object || typeof object !== "object") return

  if (!["setup_intent.succeeded", "setup_intent.setup_failed", "setup_intent.canceled"].includes(event.type)) {
    return
  }

  const parsedCallback = stripeSetupIntentCallbackSchema.safeParse(object)
  if (!parsedCallback.success) return

  const providerSessionId = parsedCallback.data.id

  const status =
    event.type === "setup_intent.succeeded"
      ? "verified"
      : event.type === "setup_intent.canceled"
        ? "expired"
        : "failed"

  await WalletStore.updateLinkSessionProviderStatus({
    providerSessionId,
    status,
    reason: parsedCallback.data.last_setup_error?.code ?? null,
    providerRequestId: parsedCallback.data.request ?? null,
  })
}

export async function handleStripeWebhookRequest(req: NextRequest, input?: { eventPrefixes?: string[] }) {
  const requestContext = createRequestLogContext(req)
  const correlationId = req.headers.get("x-correlation-id") ?? requestContext.requestId
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logApiEvent("error", "billing.webhook.secret_missing", {
      ...requestContext,
      details: { correlationId },
    })
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 })
  }

  let stripeSecretKey: string
  try {
    stripeSecretKey = getRequiredStripeSecretKey()
  } catch (error) {
    logApiEvent("error", "billing.webhook.stripe_secret_missing", {
      ...requestContext,
      details: { correlationId },
      error,
    })
    return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 500 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    logApiEvent("warn", "billing.webhook.signature_missing", {
      ...requestContext,
      details: { correlationId },
    })
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  const toleranceSeconds = getConfiguredToleranceSeconds()
  const raw = await req.text()

  try {
    verifyStripeSignedPayload({ payload: raw, secret: webhookSecret, signatureHeader: sig, toleranceSeconds })
  } catch (error) {
    logApiEvent("warn", "billing.webhook.signature_header_invalid", {
      ...requestContext,
      error,
      details: { toleranceSeconds, correlationId },
    })

    return NextResponse.json({ error: "Invalid Stripe signature header" }, { status: 400 })
  }

  const { default: Stripe } = await import("stripe")
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-01-28.clover",
  })

  let event: { id: string; type: string; created?: number; data?: { object?: any } }
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret, toleranceSeconds)
  } catch (error) {
    logApiEvent("warn", "billing.webhook.signature_invalid", {
      ...requestContext,
      error,
      details: { signaturePresent: true, correlationId },
    })
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  if (input?.eventPrefixes?.length) {
    const matches = input.eventPrefixes.some((prefix) => event.type.startsWith(prefix))
    if (!matches) {
      return NextResponse.json(
        { error: "Webhook event not accepted on this endpoint", eventType: event.type },
        { status: 400 },
      )
    }
  }

  const eventRecord = await recordWebhookEvent(event)
  if (eventRecord.duplicate) {
    const existing = await getWebhookEventByEventId(event.id)
    logApiEvent("info", "billing.webhook.duplicate_ignored", {
      ...requestContext,
      details: { eventType: event.type, status: existing?.status ?? "unknown", correlationId },
    })

    if (shouldTreatDuplicateAsProcessed(existing?.status)) {
      return NextResponse.json({ received: true, duplicate: true, processed: true })
    }
  }

  try {
    await syncWalletLinkVerificationFromWebhook(event)
    const result = await processWebhookEvent(event)
    logApiEvent("info", "billing.webhook.processed", {
      ...requestContext,
      details: { eventType: event.type, attempts: result.attempts, processed: result.processed, correlationId },
    })

    if (!result.processed) {
      return NextResponse.json(
        { received: true, processed: false, duplicate: true, inFlight: true },
        { status: 202 },
      )
    }

    return NextResponse.json({ received: true, processed: true, duplicate: eventRecord.duplicate })
  } catch (error) {
    logApiEvent("error", "billing.webhook.processing_failed", {
      ...requestContext,
      error,
      details: { eventType: event.type, correlationId },
    })

    return NextResponse.json({ received: true, processed: false }, { status: 500 })
  }
}

export { getRequiredStripeSecretKey }
