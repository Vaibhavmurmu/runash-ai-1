import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { auth } from "@/lib/auth"
import { createEmailOTP, createSMSOTP } from "@/lib/otp"
import { sql } from "@/lib/db"

const resendSchema = z.object({
  type: z.enum(["email_verification", "otp_email", "otp_sms"]),
  purpose: z.string().optional(),
  phoneNumber: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = resendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const [user] = await sql`SELECT id, email, name FROM users WHERE id = ${Number.parseInt(session.user.id)}` as Array<{ id: number; email: string; name: string }>

  if (parsed.data.type === "email_verification") {
    await auth.api.sendVerificationEmail({
      headers: request.headers,
      body: {
        email: user.email,
        callbackURL: process.env.BETTER_AUTH_EMAIL_VERIFICATION_CALLBACK_URL ?? "/login?emailVerified=1",
      },
    })
    return NextResponse.json({ message: "Verification email sent" })
  }

  if (parsed.data.type === "otp_email") {
    const result = await createEmailOTP(user.email, parsed.data.purpose ?? "login", user.id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  }

  const phoneNumber = parsed.data.phoneNumber
  if (!phoneNumber) {
    return NextResponse.json({ message: "phoneNumber is required" }, { status: 400 })
  }

  const result = await createSMSOTP(phoneNumber, parsed.data.purpose ?? "login", user.id)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
