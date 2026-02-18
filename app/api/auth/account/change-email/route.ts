import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { ensureAccountLifecycleTables } from "@/lib/auth/account-lifecycle"
import { EmailSafetyPolicyError, sendEmail } from "@/lib/email"
import { sql } from "@/lib/db"

const requestSchema = z.object({ newEmail: z.string().email() })
const confirmSchema = z.object({ token: z.string().min(20) })

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email" }, { status: 400 })
  }

  await ensureAccountLifecycleTables()
  const token = randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await sql`
    INSERT INTO account_email_change_tokens (user_id, new_email, token, expires_at)
    VALUES (${Number.parseInt(session.user.id)}, ${parsed.data.newEmail}, ${token}, ${expiresAt})
  `

  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/error?mode=confirm-email-change&token=${token}`
  try {
    await sendEmail({
      to: parsed.data.newEmail,
      subject: "Confirm your new RunAsh email",
      html: `<p>Confirm your new email by opening this link:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
    })
  } catch (error) {
    if (error instanceof EmailSafetyPolicyError) {
      return NextResponse.json(error.payload, { status: error.statusCode })
    }

    throw error
  }

  return NextResponse.json({ message: "Confirmation link sent" })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid token" }, { status: 400 })
  }

  await ensureAccountLifecycleTables()
  const [row] = await sql`
    SELECT user_id, new_email
    FROM account_email_change_tokens
    WHERE token = ${parsed.data.token}
      AND expires_at > NOW()
      AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ` as Array<{ user_id: number; new_email: string }>

  if (!row) {
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
  }

  await sql`UPDATE users SET email = ${row.new_email}, email_verified = false, updated_at = NOW() WHERE id = ${row.user_id}`
  await sql`UPDATE account_email_change_tokens SET used_at = NOW() WHERE token = ${parsed.data.token}`

  return NextResponse.json({ message: "Email updated. Please verify your new address." })
}
