import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth"
import { switchUserSessionScope } from "@/lib/auth/session-modes"

const schema = z.object({
  sessionId: z.string().min(1),
  scope: z.string().trim().min(1).max(120),
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

  const switched = await switchUserSessionScope(session.user.id, parsed.data.sessionId, parsed.data.scope)
  if (!switched) {
    return NextResponse.json({ message: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ session: switched })
}
