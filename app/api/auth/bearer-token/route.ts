import { randomBytes } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth"
import { createAuthSession, invalidateSession } from "@/lib/auth/session-modes"

const issueSchema = z.object({
  scope: z.string().trim().min(1).max(120).optional(),
  ttlMinutes: z.number().int().min(15).max(60 * 24 * 30).optional(),
})

const revokeSchema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = issueSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  const bearerToken = randomBytes(32).toString("base64url")
  const bearerSession = await createAuthSession({
    userId: session.user.id,
    mode: "bearer",
    token: bearerToken,
    scope: parsed.data.scope ?? "api",
    ttlMinutes: parsed.data.ttlMinutes,
  })

  return NextResponse.json({
    tokenType: "Bearer",
    accessToken: bearerToken,
    session: bearerSession,
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  await invalidateSession({ sessionId: parsed.data.sessionId, reason: "bearer_revoked" })
  return NextResponse.json({ revoked: true })
}
