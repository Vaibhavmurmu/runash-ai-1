import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"
import { getBillingSummaryPayload } from "@/lib/settings-billing"

const schema = z.object({
  code: z.string().trim().min(3).max(64),
}).strict()

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const validation = schema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
