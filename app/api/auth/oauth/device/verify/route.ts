import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { approveDeviceAuthorization } from "@/lib/auth/plugins/oauth-device-grant"
import { getServerAuthSession } from "@/lib/auth/session"

const verifySchema = z.object({
  user_code: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  const userId = Number.parseInt(session?.user?.id ?? "")
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const payload = verifySchema.parse(await request.json())
    const record = await approveDeviceAuthorization(payload.user_code, userId)

    if (!record) {
      return NextResponse.json({ error: "invalid_user_code" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
