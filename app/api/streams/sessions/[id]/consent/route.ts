import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import type { StudioConsentPayload } from "@/lib/analytics-pro"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const body = (await req.json()) as Partial<StudioConsentPayload>
  const payload: StudioConsentPayload = {
    allowMic: Boolean(body.allowMic),
    allowCamera: Boolean(body.allowCamera),
    allowScreenShare: Boolean(body.allowScreenShare),
    allowRecording: Boolean(body.allowRecording),
    preferredLanguage: body.preferredLanguage === "hi" ? "hi" : "en",
  }

  const stream = await Database.updateStream(params.id, {
    metadata: {
      studioConsent: payload,
      consentedAt: new Date().toISOString(),
    },
  } as never)

  return NextResponse.json({ session: stream, consent: payload })
}
