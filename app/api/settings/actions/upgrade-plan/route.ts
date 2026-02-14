import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSettingsUserId } from "@/lib/settings-security"

const schema = z.object({ confirm: z.literal(true) }).strict()

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

  return NextResponse.json({
    data: {
      planName: "Growth",
      subscriptionStatus: "trial",
    },
  })
}
