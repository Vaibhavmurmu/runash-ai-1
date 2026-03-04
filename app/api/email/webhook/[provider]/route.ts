import { type NextRequest, NextResponse } from "next/server"
import { normalizeProviderWebhook } from "@/lib/email-webhooks/adapters"
import { ingestNormalizedEvents } from "@/lib/email-webhooks/ingestion"
import { recordWebhookRejection } from "@/lib/email-webhooks/store"
import { type EmailWebhookProvider } from "@/lib/email-webhooks/types"
import { verifyWebhookSignature } from "@/lib/email-webhooks/verify-signature"

const SUPPORTED_PROVIDERS: EmailWebhookProvider[] = ["resend", "sendgrid", "ses", "generic"]

function parseProvider(value: string): EmailWebhookProvider | null {
  const normalized = value.toLowerCase() as EmailWebhookProvider
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : null
}

export async function handleEmailWebhookPost(request: Request, providerParam: string) {
  const provider = parseProvider(providerParam)
  if (!provider) {
    return NextResponse.json({ error: "Unsupported email webhook provider" }, { status: 404 })
  }

  try {
    const rawBody = await request.text()
    const verification = verifyWebhookSignature(provider, rawBody, request.headers)
    if (!verification.ok) {
      await recordWebhookRejection(provider, { reason: verification.reason || "Invalid signature", rawBody })
      return NextResponse.json({ error: verification.reason || "Invalid signature" }, { status: 401 })
    }

    let payload: Record<string, unknown>
    try {
      payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
    } catch {
      await recordWebhookRejection(provider, { reason: "Invalid JSON payload", rawBody })
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const normalization = normalizeProviderWebhook(provider, payload)
    const summary = await ingestNormalizedEvents(normalization.events)
    summary.ignored += normalization.ignoredCount

    return NextResponse.json({
      success: true,
      provider,
      ...summary,
    })
  } catch (error) {
    console.error("Error processing email webhook:", {
      provider,
      error: error instanceof Error ? error.message : "unknown",
    })
    return NextResponse.json({ error: "Failed to process email webhook" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  return handleEmailWebhookPost(request, params.provider)
}
