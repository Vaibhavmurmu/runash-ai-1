import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

export async function requireDashboardSessionUserId(request: Request): Promise<string | NextResponse> {
  const session = await getServerAuthSession(request.headers)
  const sessionUserId = session?.user?.id?.toString().trim()

  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopedHeaderUserId = request.headers.get("x-user-id")?.trim()
  if (scopedHeaderUserId && scopedHeaderUserId !== sessionUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return sessionUserId

}
