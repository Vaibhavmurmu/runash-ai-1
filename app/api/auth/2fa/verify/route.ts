import { type NextRequest, NextResponse } from "next/server"
import { verify2FACode, send2FACode, logRecoveryAttempt } from "@/lib/2fa"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const verifySchema = z.object({
  userId: z.number(),
  code: z.string().min(1, "Code is required"),
  method: z.enum(["totp", "sms", "email", "backup"]),
  identifier: z.string().optional(), // email or phone for OTP methods
})

const sendSchema = z.object({
  userId: z.number(),
  method: z.enum(["sms", "email"]),
  identifier: z.string().min(1, "Identifier is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, code, method, identifier } = verifySchema.parse(body)

    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const result = await verify2FACode(userId, code, method, identifier)

    // Log recovery attempt if using backup code
    if (method === "backup") {
      await logRecoveryAttempt(userId, "backup_code", result.success, clientIP, userAgent)
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {

    console.error("2FA verify error")

    logApiRouteError(request, "auth.2fa.verify.failed", error, { errorCode: "AUTH_2FA_VERIFY_FAILED" })


    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, method, identifier } = sendSchema.parse(body)

    const result = await send2FACode(userId, method, identifier)

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {

    console.error("2FA send error")

    logApiRouteError(request, "auth.2fa.send.failed", error, { errorCode: "AUTH_2FA_SEND_FAILED" })


    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
