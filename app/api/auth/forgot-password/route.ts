import { type NextRequest, NextResponse } from "next/server"
import { createPasswordResetToken } from "@/lib/auth-utils"
import { sendPasswordResetEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"
import { neon } from "@neondatabase/serverless"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const sql = neon(process.env.DATABASE_URL!)

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, "forgot-password", 3, 900) // 3 attempts per 15 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: "Too many password reset attempts. Please try again later." },
        { status: 429 },
      )
    }

    const body = await request.json()

    const validationResult = forgotPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 })
    }

    const { email } = validationResult.data

    const [user] = await sql`
      SELECT id, email, name FROM users WHERE email = ${email}
    `

    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    const token = await createPasswordResetToken(user.id)

    await sendPasswordResetEmail(user.email, user.name, token)

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link.",
      ...(process.env.NODE_ENV === "development" && {
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`,
      }),
    })
  } catch (error) {
    logApiRouteError(request, "auth.forgot_password.failed", error, { errorCode: "AUTH_FORGOT_PASSWORD_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
