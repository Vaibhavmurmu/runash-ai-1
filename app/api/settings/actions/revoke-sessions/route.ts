import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { rateLimit } from "@/lib/rate-limit"
import { recordAuthMetric } from "@/lib/auth-observability"
import { attachSessionRevocationCookies, invalidateSensitiveActionSessions } from "@/lib/auth/session-hardening"

const revokeSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "settings-revoke-sessions", 6, 15 * 60 * 1000)
  if (!rateLimitResult.success) {
    recordAuthMetric("auth.rate_limited", { endpoint: "settings-revoke-sessions" })
    return NextResponse.json({ error: "Too many session revoke attempts" }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const validation = revokeSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await invalidateSensitiveActionSessions(userId, "manual_revoke")

  return attachSessionRevocationCookies(NextResponse.json({ revoked: true, scope: "all" }))
}
