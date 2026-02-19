import { type NextRequest, NextResponse } from "next/server"
import { ingestInboundMessage, type InboundProvider, verifyInboundWebhookSignature } from "@/lib/email-inbound/service"

const PROVIDERS: InboundProvider[] = ["resend", "sendgrid", "ses", "generic"]

function parseProvider(value: string): InboundProvider | null {
  const candidate = value.toLowerCase() as InboundProvider
  return PROVIDERS.includes(candidate) ? candidate : null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await params
  const provider = parseProvider(providerParam)
  if (!provider) {
    return NextResponse.json({ error: "Unsupported inbound provider" }, { status: 404 })
  }

  try {
    const rawBody = await request.text()
    const signature = verifyInboundWebhookSignature(provider, rawBody, request.headers)
    if (!signature.ok) {
      return NextResponse.json({ error: signature.reason || "Invalid signature" }, { status: 401 })
    }

    const payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
    const result = await ingestInboundMessage(provider, payload)

    return NextResponse.json({ success: true, provider, ...result })
  } catch (error) {
    console.error("Inbound email processing failed", {
      provider,
      error: error instanceof Error ? error.message : "unknown",
    })
    return NextResponse.json({ error: "Failed to process inbound email" }, { status: 500 })
  }
}
