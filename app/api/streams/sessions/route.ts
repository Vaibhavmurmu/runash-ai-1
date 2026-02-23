import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = body.title ?? "Live Session"
  const description = body.description ?? ""
  const platform = body.platform ?? "custom"

  const created = await Database.createStream({
    title,
    description,
    user_id: session.user.id,
    status: "scheduled",
    platform,
    stream_key: `sk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    viewer_count: 0,
  })

  return NextResponse.json({ session: created })
}
