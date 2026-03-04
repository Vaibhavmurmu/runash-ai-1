import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { attachSessionRevocationCookies, invalidateSensitiveActionSessions } from "@/lib/auth/session-hardening"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const revokeSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-revoke-sessions", 6, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-revoke-sessions" })
    return settingsError({
      code: "SETTINGS_SESSION_REVOKE_RATE_LIMITED",
      message: "Too many session revoke attempts",
      status: 429,
      errors: sectionFieldError("security", "_section", "Too many attempts. Please try again later."),
    })
  }

  const body = await request.json().catch(() => ({}))
  const validation = revokeSchema.safeParse(body)

  if (!validation.success) {
    return settingsError({
      code: "INVALID_SECURITY_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("security", validation.error),
    })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("security", "_section", "Sign in again to continue."),
    })
  }

  await invalidateSensitiveActionSessions(userId, "manual_revoke")

  return attachSessionRevocationCookies(NextResponse.json({ revoked: true, scope: "all" }))
}
