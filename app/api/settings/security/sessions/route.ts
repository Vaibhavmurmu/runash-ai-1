import { NextResponse } from "next/server"
import { z } from "zod"

import { listActiveUserSessions, invalidateSession, switchUserSessionScope } from "@/lib/auth/session-modes"
import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

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
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
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
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return settingsError({
      code: "INVALID_SECURITY_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("security", parsed.error),
    })
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
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  const parsed = scopeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return settingsError({
      code: "INVALID_SECURITY_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("security", parsed.error),
    })
  }

  const session = await switchUserSessionScope(String(userId), parsed.data.sessionId, parsed.data.scope)
  if (!session) {
    return settingsError({
      code: "SETTINGS_SESSION_NOT_FOUND",
      message: "Session not found",
      status: 404,
      errors: sectionFieldError("security", "sessionId", "Session not found."),
    })
  }

  return NextResponse.json({ session })
}
