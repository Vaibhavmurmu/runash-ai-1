import { NextResponse } from "next/server"
import { z } from "zod"

import { disable2FA } from "@/lib/2fa"
import { resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const disableSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-disable-2fa", 5, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-disable-2fa" })
    return settingsError({
      code: "SETTINGS_DISABLE_2FA_RATE_LIMITED",
      message: "Too many disable 2FA attempts",
      status: 429,
      errors: sectionFieldError("security", "twoFactorEnabled", "Too many attempts. Please try again later."),
    })
  }

  const body = await request.json().catch(() => ({}))
  const validation = disableSchema.safeParse(body)

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
  const disabled = await disable2FA(userId)
  if (!disabled) {
    return settingsError({
      code: "SETTINGS_DISABLE_2FA_FAILED",
      message: "Unable to disable 2FA",
      status: 500,
      errors: sectionFieldError("security", "twoFactorEnabled", "Unable to disable 2FA."),
    })
  }

  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    twoFactorEnabled: false,
  }))

  if (!updated) {
    return settingsError({
      code: "SETTINGS_DISABLE_2FA_FAILED",
      message: "Unable to disable 2FA",
      status: 500,
      errors: sectionFieldError("security", "twoFactorEnabled", "Unable to disable 2FA."),
    })
  }

  return NextResponse.json({ twoFactorEnabled: updated.twoFactorEnabled })
}
