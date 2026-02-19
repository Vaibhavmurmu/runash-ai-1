import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { setOrChangePassword, verifyCurrentPassword } from "@/lib/auth/account-lifecycle"

const passwordSchema = z.object({
  mode: z.enum(["set", "change", "verify"]),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const userId = Number.parseInt(session.user.id)

  if (parsed.data.mode === "verify") {
    const ok = await verifyCurrentPassword(userId, parsed.data.currentPassword ?? "")
    return NextResponse.json({ verified: ok }, { status: ok ? 200 : 400 })
  }

  if (!parsed.data.newPassword) {
    return NextResponse.json({ message: "New password is required" }, { status: 400 })
  }

  await setOrChangePassword(userId, {
    mode: parsed.data.mode,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  })

  return NextResponse.json({ message: `Password ${parsed.data.mode === "set" ? "set" : "changed"} successfully` })
}
