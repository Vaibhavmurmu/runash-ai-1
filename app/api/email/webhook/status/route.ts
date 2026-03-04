import { type NextRequest, NextResponse } from "next/server"
import { normalizeProviderWebhook } from "@/lib/email-webhooks/adapters"
import { ingestNormalizedEvents } from "@/lib/email-webhooks/ingestion"
import { type EmailWebhookProvider } from "@/lib/email-webhooks/types"

const SUPPORTED_PROVIDERS: EmailWebhookProvider[] = ["resend", "sendgrid", "ses", "generic"]

function parseProvider(providerRaw: unknown): EmailWebhookProvider | null {
  const normalized = String(providerRaw || "generic").toLowerCase() as EmailWebhookProvider
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { provider?: string; payload?: Record<string, unknown> }
    const provider = parseProvider(body.provider)
    if (!provider) {
      return NextResponse.json({ error: "Unsupported email webhook provider" }, { status: 400 })
    }

    const normalization = normalizeProviderWebhook(provider, body.payload || {})
    const summary = await ingestNormalizedEvents(normalization.events)
    summary.ignored += normalization.ignoredCount

    return NextResponse.json({ success: true, provider, ...summary })
  } catch {
    return NextResponse.json({ error: "Invalid webhook status payload" }, { status: 400 })
  }
}
