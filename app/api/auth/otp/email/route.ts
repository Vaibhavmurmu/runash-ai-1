import { type NextRequest, NextResponse } from "next/server"
import { createEmailOTP, verifyOTP } from "@/lib/otp"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { applyAuthCaptchaMiddleware } from "@/lib/auth/captcha-middleware"
import { setSessionCookies } from "@/lib/auth/cookies"
import { SignJWT } from "jose"
import { getAuthSecret } from "@/lib/auth"
import { createUserSession } from "@/lib/auth-utils"
import { sql } from "@/lib/db"
import { handleVerifyEmailOtp, type EmailOtpUser } from "./verify-email-otp-handler"

const sendOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["login", "registration", "password_reset", "2fa_setup", "2fa_login"]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, purpose } = sendOTPSchema.parse(body)

    const captchaFailure = await applyAuthCaptchaMiddleware(request, {
      endpoint: "otp/email",
      action: "otp-send",
      body,
      identifier: email,
    })
    if (captchaFailure) {
      return captchaFailure
    }

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
  return handleVerifyEmailOtp(request, {
    verifyOtp: verifyOTP,
    resolveOrCreateUserIdentity,
    issueLoginSession,
    setSessionCookies,
    onError: (requestWithError, error) => {
      logApiRouteError(requestWithError, "auth.otp.email.verify_failed", error, { errorCode: "AUTH_OTP_EMAIL_VERIFY_FAILED" })

      if (error instanceof z.ZodError) {
        return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 })
      }

      return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    },
  })
}

async function resolveOrCreateUserIdentity(email: string): Promise<EmailOtpUser | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const displayName = normalizedEmail.split("@")[0] || "RunAsh User"

  const [existingUser] = await sql<EmailOtpUser>`
    SELECT id, email, name, role
    FROM users
    WHERE LOWER(email) = ${normalizedEmail}
    LIMIT 1
  `

  if (existingUser) {
    return existingUser
  }

  await sql`
    INSERT INTO users (email, name, role, email_verified, email_verified_at)
    VALUES (${normalizedEmail}, ${displayName}, 'user', true, NOW())
    ON CONFLICT (email) DO NOTHING
  `

  const [createdOrConcurrentUser] = await sql<EmailOtpUser>`
    SELECT id, email, name, role
    FROM users
    WHERE LOWER(email) = ${normalizedEmail}
    LIMIT 1
  `

  return createdOrConcurrentUser ?? null
}

async function issueLoginSession(user: EmailOtpUser, request: Request): Promise<string> {
  const issuedAtEpoch = Math.floor(Date.now() / 1000)
  const expiresAtEpoch = issuedAtEpoch + 30 * 24 * 60 * 60
  const expiresAt = new Date(expiresAtEpoch * 1000)

  const secret = new TextEncoder().encode(getAuthSecret())
  const sessionToken = await new SignJWT({
    sub: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    iat: issuedAtEpoch,
    exp: expiresAtEpoch,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret)

  const forwardedFor = request.headers.get("x-forwarded-for")
  const clientIP = forwardedFor ? forwardedFor.split(",")[0]?.trim() : request.headers.get("x-real-ip")
  const userAgent = request.headers.get("user-agent") ?? undefined

  await createUserSession(user.id, sessionToken, expiresAt, {
    ipAddress: clientIP,
    userAgent,
  })

  return sessionToken
}
