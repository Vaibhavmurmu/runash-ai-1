import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

export async function requireEditorUser() {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  return { userId: session.user.id }
}
