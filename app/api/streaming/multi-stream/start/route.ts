import { NextResponse, type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { createMultiStreamSession, upsertSessionPlatformState } from "@/lib/repositories/multi-streaming"
import { startMultiStreamBodySchema } from "@/lib/streaming/multi-platform-contracts"

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = startMultiStreamBodySchema.safeParse(await req.json())
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid session payload" }, { status: 400 })
  }

  const multiStreamSession = await createMultiStreamSession({
    id: crypto.randomUUID(),
    userId: session.user.id,
    title: payload.data.title,
    description: payload.data.description,
    platforms: payload.data.platforms,
    status: "live",
    settings: payload.data.settings,
  })

  await Promise.all(
    payload.data.platforms.map(async (platformId) => {
      await upsertSessionPlatformState({
        id: crypto.randomUUID(),
        sessionId: multiStreamSession.id,
        platformId,
        platformName: platformId,
        state: "live",
      })
    }),
  )

  return NextResponse.json(multiStreamSession)
}
