import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { listQASessions, startQASession } from "@/lib/live-interactions"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessions = await listQASessions(params.id)
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { prompt?: string } | null
  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 })
  }

  const qaSession = await startQASession(params.id, body.prompt.trim())
  return NextResponse.json({ session: qaSession }, { status: 201 })
}
