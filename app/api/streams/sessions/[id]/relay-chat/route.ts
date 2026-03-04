import { NextRequest, NextResponse } from "next/server"
import { addMessage } from "@/lib/chat"
import { createStreamSessionAutomationEvent } from "@/lib/repositories/stream-session-automation-events"
import { applyChatEvent } from "@/lib/stream-session-state"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const text = body.message ?? body.text
  if (!text) return NextResponse.json({ error: "Message is required" }, { status: 400 })

  const streamId = params.id
  const platform = body.platform ?? body.metadata?.platform ?? "custom"
  const username = body.username ?? "PlatformUser"

  const saved = await addMessage({
    streamId,
    userId: body.userId ?? `${platform}:${username}`,
    username,
    text,
  })

  applyChatEvent(streamId)

  const lowerText = String(text).toLowerCase()
  const automationSignals = [
    { marker: /bundle|combo/, eventType: "seller_ai.trigger_bundle_promotion" },
    { marker: /limited-time|flash sale|expires/, eventType: "seller_ai.trigger_limited_time_discount" },
    { marker: /deal approved|accept deal|approved offer/, eventType: "seller_ai.initiate_approved_deal" },
  ]

  for (const signal of automationSignals) {
    if (signal.marker.test(lowerText)) {
      await createStreamSessionAutomationEvent({
        id: `ssa_${saved.id}_${signal.eventType}`,
        sessionId: streamId,
        streamId,
        eventType: signal.eventType,
        stage: signal.eventType.includes("approved_deal") ? "final" : "intermediate",
        actorRole: "seller_ai",
        eventPayload: {
          message_id: saved.id,
          platform,
          username,
        },
      })
    }
  }

  return NextResponse.json({
    relayed: true,
    message: {
      ...saved,
      platform,
      metadata: body.metadata ?? { connector: platform, relayed: true },
    },
  })
}
