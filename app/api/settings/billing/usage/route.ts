import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError } from "@/app/api/settings/_lib/errors"
import { getBillingUsagePayload } from "@/lib/settings-billing"

export async function GET(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("billing", "_section", "Sign in again to continue."),
    })
  }

  const data = await getBillingUsagePayload(userId)
  return NextResponse.json({ data })
}
