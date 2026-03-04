import { NextResponse } from "next/server"
import { z } from "zod"

import { generateApiKey, resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { attachSessionRevocationCookies, invalidateSensitiveActionSessions } from "@/lib/auth/session-hardening"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const rotateSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-regenerate-api-key", 6, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-regenerate-api-key" })
    return settingsError({
      code: "SETTINGS_API_KEY_ROTATION_RATE_LIMITED",
      message: "Too many API key rotation attempts",
      status: 429,
      errors: sectionFieldError("security", "apiKeyMasked", "Too many attempts. Please try again later."),
    })
  }

  const body = await request.json().catch(() => ({}))
  const validation = rotateSchema.safeParse(body)

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
  const nextKey = generateApiKey()

  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    apiKeyHash: nextKey.apiKeyHash,
    apiKeyMasked: nextKey.apiKeyMasked,
    apiKeyLastRotatedAt: nextKey.apiKeyLastRotatedAt,
  }))

  if (!updated) {
    return settingsError({
      code: "SETTINGS_API_KEY_ROTATION_FAILED",
      message: "Unable to rotate API key",
      status: 500,
      errors: sectionFieldError("security", "apiKeyMasked", "Unable to rotate API key."),
    })
  }

  await invalidateSensitiveActionSessions(userId, "api_key_rotated")

  return attachSessionRevocationCookies(NextResponse.json({
    apiKey: nextKey.apiKey,
    apiKeyMasked: updated.apiKeyMasked,
    apiKeyLastRotatedAt: updated.apiKeyLastRotatedAt,
  }))
}
