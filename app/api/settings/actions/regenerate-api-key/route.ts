import { NextResponse } from "next/server"
import { z } from "zod"

import { generateApiKey, resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { attachSessionRevocationCookies, invalidateSensitiveActionSessions } from "@/lib/auth/session-hardening"

const rotateSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-regenerate-api-key", 6, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-regenerate-api-key" })
    return NextResponse.json({ error: "Too many API key rotation attempts" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const validation = rotateSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const nextKey = generateApiKey()

  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    apiKeyHash: nextKey.apiKeyHash,
    apiKeyMasked: nextKey.apiKeyMasked,
    apiKeyLastRotatedAt: nextKey.apiKeyLastRotatedAt,
  }))

  if (!updated) {
    return NextResponse.json({ error: "Unable to rotate API key" }, { status: 500 })
  }

  await invalidateSensitiveActionSessions(userId, "api_key_rotated")

  return attachSessionRevocationCookies(NextResponse.json({
    apiKey: nextKey.apiKey,
    apiKeyMasked: updated.apiKeyMasked,
    apiKeyLastRotatedAt: updated.apiKeyLastRotatedAt,
  }))
}
