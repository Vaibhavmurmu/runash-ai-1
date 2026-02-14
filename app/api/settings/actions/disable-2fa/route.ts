import { NextResponse } from "next/server"
import { z } from "zod"

import { disable2FA } from "@/lib/2fa"
import { resolveSettingsUserId, updateUserSecurityState } from "@/lib/settings-security"

const disableSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const validation = disableSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await disable2FA(userId)
  if (!disabled) {
    return NextResponse.json({ error: "Unable to disable 2FA" }, { status: 500 })
  }

  const updated = await updateUserSecurityState(userId, (current) => ({
    ...current,
    twoFactorEnabled: false,
  }))

  if (!updated) {
    return NextResponse.json({ error: "Unable to disable 2FA" }, { status: 500 })
  }

  return NextResponse.json({ twoFactorEnabled: updated.twoFactorEnabled })
}
