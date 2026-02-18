import { type NextRequest, NextResponse } from "next/server"
import { normalizeGenericWebhook } from "@/lib/email-webhooks/adapters/generic"
import { ingestNormalizedEvents } from "@/lib/email-webhooks/ingestion"

// Legacy endpoint kept for backward compatibility.
// Prefer /api/email/webhook/{provider} for provider-native payloads.
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, any>
    const normalization = normalizeGenericWebhook(payload)
    const filteredEvents = normalization.events.filter((event) => event.type === "bounced" || event.type === "complaint")

    const summary = await ingestNormalizedEvents(filteredEvents)
    summary.ignored += normalization.ignoredCount + (normalization.events.length - filteredEvents.length)

    return NextResponse.json({ success: true, provider: "generic", ...summary })
  } catch (error) {
    console.error("Error processing legacy bounce webhook:", error)
    return NextResponse.json({ error: "Failed to process bounce webhook" }, { status: 500 })
  }
}
