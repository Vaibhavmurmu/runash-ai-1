import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

import { resolveRequestId } from "@/lib/api/response"
import { getAgentSessionHistory } from "@/lib/repositories/agent-orchestration"

const AGENT_CHAT_ENABLED = process.env.RUNASH_AGENT_CHAT_ENABLED !== "false"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = resolveRequestId(request)

  if (!AGENT_CHAT_ENABLED) {
    return NextResponse.json({ error: "Agent APIs disabled", requestId }, { status: 404 })
  }

  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") ?? "100")
  const offset = Number(searchParams.get("offset") ?? "0")

  const { id } = await params
  const record = await getAgentSessionHistory(
    id,
    String(session.user.id),
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 100,
    Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
  )
  if (!record) {
    return NextResponse.json({ error: "Session not found", requestId }, { status: 404 })
  }

  return NextResponse.json({ success: true, requestId, data: record })
}
