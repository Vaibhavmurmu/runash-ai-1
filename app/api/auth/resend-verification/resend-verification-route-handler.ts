import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth, emailVerificationCallbackURL } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { logApiRouteError } from "@/lib/api/logging"
import { AUTH_ENDPOINT_RATE_LIMITS } from "@/lib/auth-security-config"
import { sql } from "@/lib/db"

type ResendVerificationDependencies = {
  enforceRateLimit: typeof rateLimit
  findUserByEmail: (email: string) => Promise<{ id: string | number; email_verified: boolean } | null>
  sendVerificationEmail: (args: { headers: Headers; body: { email: string; callbackURL?: string } }) => Promise<unknown>
}

const resendVerificationSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
})

const successResponse = {
  message: "If an account with that email exists, we've sent a verification link.",
}

const defaultDependencies: ResendVerificationDependencies = {
  enforceRateLimit: rateLimit,
  findUserByEmail: async (email) => {
    const [user] = await sql`
      SELECT id, email_verified
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    return user ?? null
  },
  sendVerificationEmail: (args) => auth.api.sendVerificationEmail(args),
}

export async function handleResendVerification(
  request: NextRequest,
  dependencies: ResendVerificationDependencies = defaultDependencies,
): Promise<Response> {
  try {
    const rateLimitResult = await dependencies.enforceRateLimit(
      request,
      "resend-verification",
      AUTH_ENDPOINT_RATE_LIMITS["resend-verification"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["resend-verification"].windowMs,
    )

    if (!rateLimitResult.success) {
      return NextResponse.json({ message: "Too many resend attempts. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = resendVerificationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = parsed.data.email.toLowerCase()
    const user = await dependencies.findUserByEmail(normalizedEmail)

    if (!user || user.email_verified) {
      return NextResponse.json(successResponse)
    }

    await dependencies.sendVerificationEmail({
      headers: request.headers,
      body: {
        email: normalizedEmail,
        callbackURL: emailVerificationCallbackURL,
      },
    })

    return NextResponse.json(successResponse)
  } catch (error) {
    logApiRouteError(request, "auth.resend_verification.failed", error, { errorCode: "AUTH_RESEND_VERIFICATION_FAILED" })
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function handleResendVerificationRequest(
  request: Request,
  dependencies?: ResendVerificationDependencies,
): Promise<Response> {
  return handleResendVerification(request as NextRequest, dependencies)
}
