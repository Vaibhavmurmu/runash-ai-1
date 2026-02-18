import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth"
import { issueOneTimeTransferToken, listActiveUserSessions } from "@/lib/auth/session-modes"

const schema = z.object({
  sourceDomain: z.string().min(1),
  targetDomain: z.string().min(1),
  ttlSeconds: z.number().int().min(30).max(600).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  const [activeSession] = await listActiveUserSessions(session.user.id)
  if (!activeSession) {
    return NextResponse.json({ message: "No active session" }, { status: 404 })
  }

  const ott = await issueOneTimeTransferToken({
    sessionId: activeSession.id,
    sourceDomain: parsed.data.sourceDomain,
    targetDomain: parsed.data.targetDomain,
    ttlSeconds: parsed.data.ttlSeconds,
  })

  return NextResponse.json({ ott })
}
