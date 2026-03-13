import { NextResponse, type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { updatePlatformCustomTitle } from "@/lib/repositories/multi-streaming"
import { updateTitleBodySchema } from "@/lib/streaming/multi-platform-contracts"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = updateTitleBodySchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: "Invalid title payload" }, { status: 400 })
  }

  const updated = await updatePlatformCustomTitle({
    platformId: id,
    userId: session.user.id,
    title: body.data.title,
  })

  if (!updated) {
    return NextResponse.json(
      {
        code: "STREAMING_CAPABILITY_UNSUPPORTED",
        error: "Platform does not support title updates",
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true, title: body.data.title })
}
