import { type NextRequest, NextResponse } from "next/server"
import { normalizeProviderWebhook } from "@/lib/email-webhooks/adapters"
import { ingestNormalizedEvents } from "@/lib/email-webhooks/ingestion"
import { type EmailWebhookProvider } from "@/lib/email-webhooks/types"
import { verifyWebhookSignature } from "@/lib/email-webhooks/verify-signature"

const SUPPORTED_PROVIDERS: EmailWebhookProvider[] = ["resend", "sendgrid", "ses", "generic"]

function parseProvider(value: string): EmailWebhookProvider | null {
  const normalized = value.toLowerCase() as EmailWebhookProvider
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : null
}

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = parseProvider(params.provider)
  if (!provider) {
    return NextResponse.json({ error: "Unsupported email webhook provider" }, { status: 404 })
  }

  try {
    const rawBody = await request.text()
    const verification = verifyWebhookSignature(provider, rawBody, request.headers)
    if (!verification.ok) {
      return NextResponse.json({ error: verification.reason || "Invalid signature" }, { status: 401 })
    }

    const payload = rawBody ? (JSON.parse(rawBody) as Record<string, any>) : {}
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
