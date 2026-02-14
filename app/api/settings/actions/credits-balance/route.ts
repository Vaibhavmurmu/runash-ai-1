import { NextResponse } from "next/server"

import { resolveSettingsUserId } from "@/lib/settings-security"

export async function POST(request: Request) {
  const userId = await resolveSettingsUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    data: {
      creditsBalance: 84,
      autoRechargeEnabled: true,
    },
  })
}
