import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError } from "@/app/api/settings/_lib/errors"
import { getBillingInvoicesPayload } from "@/lib/settings-billing"

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

  const url = new URL(request.url)
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10)
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10)
  const data = await getBillingInvoicesPayload(userId, limit, offset)

  return NextResponse.json({ data })
}
