import { type NextRequest, NextResponse } from "next/server"
import { createSMSOTP, verifyOTP } from "@/lib/otp"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const phoneRegex = /^\+[1-9]\d{1,14}$/

const sendSMSOTPSchema = z.object({
  phoneNumber: z.string().regex(phoneRegex, "Invalid phone number format. Use international format (+1234567890)"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

const verifySMSOTPSchema = z.object({
  phoneNumber: z.string().regex(phoneRegex, "Invalid phone number format"),
  code: z.string().length(6, "OTP code must be 6 digits"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, purpose } = sendSMSOTPSchema.parse(body)

    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const result = await createSMSOTP(phoneNumber, purpose, undefined, clientIP, userAgent)

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    logApiRouteError(request, "auth.otp.sms.send_failed", error, { errorCode: "AUTH_OTP_SMS_SEND_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, code, purpose } = verifySMSOTPSchema.parse(body)

    const result = await verifyOTP(code, phoneNumber, purpose, "sms")

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    logApiRouteError(request, "auth.otp.sms.verify_failed", error, { errorCode: "AUTH_OTP_SMS_VERIFY_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
