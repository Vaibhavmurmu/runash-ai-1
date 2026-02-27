import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { getBillingUsagePayload } from "@/lib/settings-billing"

export async function GET(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await getBillingUsagePayload(userId)
  return NextResponse.json({ data })
}
