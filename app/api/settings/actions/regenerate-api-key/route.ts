import { NextResponse } from "next/server"
import { z } from "zod"

import { generateApiKey, resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"

const rotateSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
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

  return NextResponse.json({
    apiKey: nextKey.apiKey,
    apiKeyMasked: updated.apiKeyMasked,
    apiKeyLastRotatedAt: updated.apiKeyLastRotatedAt,
  })
}
