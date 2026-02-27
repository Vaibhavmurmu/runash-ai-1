import { NextResponse } from "next/server"
import { z } from "zod"

import { listActiveUserSessions, invalidateSession, switchUserSessionScope } from "@/lib/auth/session-modes"
import { resolveSettingsUserId } from "@/lib/settings-security"

const revokeSchema = z
  .object({
    sessionId: z.string().trim().min(1).optional(),
    revokeAll: z.boolean().optional(),
  })
  .refine((value) => value.revokeAll === true || Boolean(value.sessionId), {
    message: "Either sessionId or revokeAll=true is required",
  })

const scopeSchema = z.object({
  sessionId: z.string().trim().min(1),
  scope: z.string().trim().min(1).max(120),
})

export async function GET(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const sessions = await listActiveUserSessions(String(userId))

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      mode: session.mode,
      scope: session.scope,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      linkedFromSessionId: session.linkedFromSessionId,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
    })),
    concurrentSessionCount: sessions.length,
  })
}

export async function DELETE(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  if (parsed.data.revokeAll) {
    await invalidateSession({ userId: String(userId), reason: "settings_revoke_all" })
    return NextResponse.json({ revoked: true, revokedAll: true })
  }

  await invalidateSession({ sessionId: parsed.data.sessionId, userId: String(userId), reason: "settings_revoke_single" })
  return NextResponse.json({ revoked: true, revokedAll: false })
}

export async function PATCH(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = scopeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  const session = await switchUserSessionScope(String(userId), parsed.data.sessionId, parsed.data.scope)
  if (!session) {
    return NextResponse.json({ message: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ session })
}
