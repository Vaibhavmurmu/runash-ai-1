import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { getBillingInvoicesPayload } from "@/lib/settings-billing"

export async function GET(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10)
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10)
  const data = await getBillingInvoicesPayload(userId, limit, offset)

  return NextResponse.json({ data })
}
