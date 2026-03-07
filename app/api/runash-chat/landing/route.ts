import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

const DEFAULT_PAYLOAD = {
  sessions: 0,
  messages: 0,
  toolEvents: 0,
  activeIntegrations: 6,
}

export async function GET() {
  try {
    const [sessionCount, messageCount, toolEventCount] = await Promise.all([
      queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM chat_sessions WHERE archived_at IS NULL"),
      queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM chat_messages WHERE deleted_at IS NULL"),
      queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM chat_tool_events"),
    ])

    const payload = {
      sessions: Number.parseInt(sessionCount?.count ?? "0", 10),
      messages: Number.parseInt(messageCount?.count ?? "0", 10),
      toolEvents: Number.parseInt(toolEventCount?.count ?? "0", 10),
      activeIntegrations: DEFAULT_PAYLOAD.activeIntegrations,
    }

    return NextResponse.json({ data: payload })
  } catch {
    return NextResponse.json({ data: DEFAULT_PAYLOAD, degraded: true })
  }
}
