import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"
import { getBillingSummaryPayload } from "@/lib/settings-billing"

const schema = z.object({
  code: z.string().trim().min(3).max(64),
}).strict()

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const validation = schema.safeParse(body)

  if (!validation.success) {
    return settingsError({
      code: "INVALID_BILLING_ACTION_PAYLOAD",
      message: "Invalid request",
      status: 400,
      errors: zodSectionErrors("billing", validation.error),
    })
  }

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
  const isSupportedCode = ["RUNASH-START", "RUNASH-WELCOME"].includes(validation.data.code.toUpperCase())

  return NextResponse.json({
    data: {
      ...summary,
      creditsBalance: summary.creditsBalance + (isSupportedCode ? 25 : 0),
      redemptionApplied: isSupportedCode,
      redeemedCode: validation.data.code,
    },
  })
}
