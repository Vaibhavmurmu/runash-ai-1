import { type NextRequest, NextResponse } from "next/server"
import { resetPassword } from "@/lib/auth-utils"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, "reset-password", 5, 900) // 5 attempts per 15 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: "Too many password reset attempts. Please try again later." },
        { status: 429 },
      )
    }

    const body = await request.json()

    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { token, password } = validationResult.data

    await resetPassword(token, password)

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    logApiRouteError(request, "auth.reset_password.failed", error, { errorCode: "AUTH_RESET_PASSWORD_FAILED" })

    if (error instanceof Error && error.message === "Invalid or expired token") {
      return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 400 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
