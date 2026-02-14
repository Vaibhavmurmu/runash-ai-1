import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"

const deleteSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}))
  const validation = deleteSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    apiKeyHash: undefined,
    apiKeyMasked: "Not generated",
    apiKeyLastRotatedAt: "",
  }))

  if (!updated) {
    return NextResponse.json({ error: "Unable to delete API key" }, { status: 500 })
  }

  return NextResponse.json({
    apiKeyMasked: updated.apiKeyMasked,
    apiKeyLastRotatedAt: updated.apiKeyLastRotatedAt,
  })
}
