import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { getBillingSummaryPayload } from "@/lib/settings-billing"

export async function POST(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = await getBillingSummaryPayload(userId)

  return NextResponse.json({
    data: {
      planName: summary.planName,
      subscriptionStatus: summary.subscriptionStatus,
    },
  })
}
