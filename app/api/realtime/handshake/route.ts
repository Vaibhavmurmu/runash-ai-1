import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { authorizeRealtimeChannels, issueRealtimeToken } from "@/services/realtime/auth"

export async function POST(request: Request) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const body = (await request.json().catch(() => ({}))) as { channels?: string[] }
  const requestedChannels = Array.isArray(body.channels) ? body.channels : []
  if (requestedChannels.length === 0) {
    return NextResponse.json({ error: "channels is required" }, { status: 400 })
  }

  const channels = await authorizeRealtimeChannels(auth.userId, requestedChannels)
  if (channels.length === 0) {
    return NextResponse.json({ error: "No authorized channels" }, { status: 403 })
  }

  const token = issueRealtimeToken({ userId: auth.userId, channels })
  return NextResponse.json({ token, channels, version: "1.0" })
}
