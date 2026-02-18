import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { runSecureAccountDelete, issueAccountDeletionCode, verifyAccountDeletionCode } from "@/lib/auth/account-lifecycle"
import { sql } from "@/lib/db"

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  username: z.string().min(3).max(60).optional(),
  phone: z.string().min(8).max(20).optional(),
})

const deleteSchema = z.object({
  verificationCode: z.string().length(6),
})

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const [user] = await sql`
    SELECT id, email, username, name, phone, email_verified, role, created_at, updated_at
    FROM users
    WHERE id = ${Number.parseInt(session.user.id)}
  `

  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updates = parsed.data
  await sql`
    UPDATE users
    SET name = COALESCE(${updates.name ?? null}, name),
        username = COALESCE(${updates.username ?? null}, username),
        phone = COALESCE(${updates.phone ?? null}, phone),
        updated_at = NOW()
    WHERE id = ${Number.parseInt(session.user.id)}
  `

  return NextResponse.json({ message: "Account updated successfully" })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  if (!body?.verificationCode) {
    const [user] = await sql`SELECT email FROM users WHERE id = ${Number.parseInt(session.user.id)}` as Array<{ email: string }>
    await issueAccountDeletionCode(Number.parseInt(session.user.id), user.email)
    return NextResponse.json({ message: "Verification code sent to your email" }, { status: 202 })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid verification code" }, { status: 400 })
  }

  const isValid = await verifyAccountDeletionCode(Number.parseInt(session.user.id), parsed.data.verificationCode)
  if (!isValid) {
    return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 })
  }

  await runSecureAccountDelete({
    userId: Number.parseInt(session.user.id),
    requestId: request.headers.get("x-request-id") ?? undefined,
  })

  return NextResponse.json({ message: "Account deleted successfully" })
}
