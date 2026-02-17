import { type NextRequest, NextResponse } from "next/server"
import { changePassword } from "@/lib/auth-utils"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { getServerAuthSession } from "@/lib/auth/session"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, "change-password", 5, 900) // 5 attempts per 15 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: "Too many password change attempts. Please try again later." },
        { status: 429 },
      )
    }

    const body = await request.json()

    const validationResult = changePasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { currentPassword, newPassword } = validationResult.data

    await changePassword(Number.parseInt(session.user.id), currentPassword, newPassword)

    return NextResponse.json({ message: "Password changed successfully" })
  } catch (error) {
    logApiRouteError(request, "auth.change_password.failed", error, { errorCode: "AUTH_CHANGE_PASSWORD_FAILED" })

    if (error instanceof Error && error.message === "Invalid current password") {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 })
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
