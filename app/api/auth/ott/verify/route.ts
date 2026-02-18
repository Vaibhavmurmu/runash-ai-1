import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAuthSession, verifyOneTimeTransferToken } from "@/lib/auth/session-modes"

const schema = z.object({
  token: z.string().min(1),
  sourceDomain: z.string().min(1),
  targetDomain: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  const verified = await verifyOneTimeTransferToken(parsed.data)
  if (!verified) {
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
  }

  const transferredSession = await createAuthSession({
    userId: verified.userId,
    mode: "ott",
    scope: "cross-domain",
    linkedFromSessionId: verified.sessionId,
    ttlMinutes: 60,
  })

  return NextResponse.json({ session: transferredSession })
}
