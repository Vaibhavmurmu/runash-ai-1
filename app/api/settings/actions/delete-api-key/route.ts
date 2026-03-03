import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const deleteSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function DELETE(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-delete-api-key", 4, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-delete-api-key" })
    return settingsError({
      code: "SETTINGS_API_KEY_DELETE_RATE_LIMITED",
      message: "Too many API key deletion attempts",
      status: 429,
      errors: sectionFieldError("security", "apiKeyMasked", "Too many attempts. Please try again later."),
    })
  }

  const body = await request.json().catch(() => ({}))
  const validation = deleteSchema.safeParse(body)

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
  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    apiKeyHash: undefined,
    apiKeyMasked: "Not generated",
    apiKeyLastRotatedAt: "",
  }))

  if (!updated) {
    return settingsError({
      code: "SETTINGS_API_KEY_DELETE_FAILED",
      message: "Unable to delete API key",
      status: 500,
      errors: sectionFieldError("security", "apiKeyMasked", "Unable to delete API key."),
    })
  }

  return NextResponse.json({
    apiKeyMasked: updated.apiKeyMasked,
    apiKeyLastRotatedAt: updated.apiKeyLastRotatedAt,
  })
}
