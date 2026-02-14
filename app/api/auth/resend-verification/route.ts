import { type NextRequest, NextResponse } from "next/server"
import { generateEmailVerificationToken } from "@/lib/auth-utils"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rate-limit"
import { neon } from "@neondatabase/serverless"
import { logApiRouteError } from "@/lib/api/logging"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for resend attempts
    const rateLimitResult = await rateLimit(request, "resend-verification", 3, 600) // 3 attempts per 10 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json({ message: "Too many resend attempts. Please try again later." }, { status: 429 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const [user] = await sql`
      SELECT id, email, name, email_verified 
      FROM users 
      WHERE email = ${email}
    `

    if (!user) {
      return NextResponse.json({ message: "If an account with that email exists, we've sent a verification link." })
    }

    if (user.email_verified) {
      return NextResponse.json({ message: "Email is already verified" }, { status: 400 })
    }

    // Generate new verification token
    const verificationToken = await generateEmailVerificationToken(user.id)
    await sendVerificationEmail(email, user.name, verificationToken)

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a verification link.",
    })
  } catch (error) {
    logApiRouteError(request, "auth.resend_verification.failed", error, { errorCode: "AUTH_RESEND_VERIFICATION_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
