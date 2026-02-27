import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError } from "@/app/api/settings/_lib/errors"
import { getBillingSummaryPayload } from "@/lib/settings-billing"

export async function POST(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return settingsError({
      code: "SETTINGS_UNAUTHORIZED",
      message: "Unauthorized",
      status: 401,
      errors: sectionFieldError("billing", "_section", "Sign in again to continue."),
    })
  }

  const summary = await getBillingSummaryPayload(userId)

  return NextResponse.json({
    data: {
      billingMethodSummary: summary.billingMethodSummary,
      subscriptionStatus: summary.subscriptionStatus,
    },
  })
}
