import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth"
import { linkAnonymousIdentity } from "@/lib/auth/session-modes"

const schema = z.object({
  anonymousId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  }

  await linkAnonymousIdentity(parsed.data.anonymousId, session.user.id)

  return NextResponse.json({ linked: true })
}
