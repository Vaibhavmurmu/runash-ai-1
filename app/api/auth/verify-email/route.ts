import { type NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/auth-utils"
import { neon } from "@neondatabase/serverless"
import { logApiRouteError } from "@/lib/api/logging"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ message: "Verification token is required" }, { status: 400 })
    }

    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.json({ message: result.error || "Invalid or expired verification token" }, { status: 400 })
    }

    // Update user email verification status
    await sql`
      UPDATE users 
      SET email_verified = true, email_verified_at = NOW()
      WHERE id = ${result.userId}
    `

    // Delete used verification token
    await sql`
      DELETE FROM email_verification_tokens 
      WHERE token = ${token}
    `

    return NextResponse.json({
      message: "Email verified successfully",
    })
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
