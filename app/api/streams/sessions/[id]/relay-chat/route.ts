import { NextRequest, NextResponse } from "next/server"
import { addMessage } from "@/lib/chat"
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

  return NextResponse.json({
    relayed: true,
    message: {
      ...saved,
      platform,
      metadata: body.metadata ?? { connector: platform, relayed: true },
    },
  })
}
