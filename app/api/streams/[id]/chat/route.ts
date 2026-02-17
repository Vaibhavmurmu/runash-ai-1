import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { addMessage } from "@/lib/chat"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const streamId = Number.parseInt(params.id)
    const { searchParams } = new URL(req.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const messages = await Database.getStreamChat(streamId, limit)
    return NextResponse.json({ messages: messages.reverse() })
  } catch (error) {
    console.error("Get chat messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    const body = await req.json()
    const content: string | undefined = body?.message ?? body?.text
    const type = body?.type ?? "message"

    if (!content) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const streamId = Number.parseInt(params.id)
    const username = body?.username || session?.user?.name || "Anonymous"
    const userId = session?.user?.id || null

    const chatMessage = await Database.addChatMessage({
      stream_id: streamId,
      user_id: userId,
      username,
      message: content,
      type,
    })

    try {
      await addMessage({
        streamId: String(streamId),
        userId: userId ?? "anon",
        username: username,
        text: content,
      })
    } catch (e) {
      console.warn("[v0] addMessage redis push failed:", (e as Error)?.message)
    }

    return NextResponse.json({ message: chatMessage })
  } catch (error) {
    console.error("Add chat message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
