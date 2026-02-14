import { type NextRequest, NextResponse } from "next/server"
import { createEmailOTP, verifyOTP } from "@/lib/otp"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const sendOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP code must be 6 digits"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, purpose } = sendOTPSchema.parse(body)

    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const result = await createEmailOTP(email, purpose, undefined, clientIP, userAgent)

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    logApiRouteError(request, "auth.otp.email.send_failed", error, { errorCode: "AUTH_OTP_EMAIL_SEND_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, purpose } = verifyOTPSchema.parse(body)

    const result = await verifyOTP(code, email, purpose, "email")

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    logApiRouteError(request, "auth.otp.email.verify_failed", error, { errorCode: "AUTH_OTP_EMAIL_VERIFY_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
