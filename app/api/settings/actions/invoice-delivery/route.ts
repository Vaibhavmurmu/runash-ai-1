import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { getBillingSummaryPayload } from "@/lib/settings-billing"
import { sectionFieldError, settingsError, zodSectionErrors } from "@/app/api/settings/_lib/errors"

const schema = z.object({ confirm: z.literal(true) }).strict()

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
  return NextResponse.json({ data: { subscriptionStatus: summary.subscriptionStatus, invoiceEmail: summary.invoiceEmail } })
}
