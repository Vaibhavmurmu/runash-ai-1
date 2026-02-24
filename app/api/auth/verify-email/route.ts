import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { logApiRouteError } from "@/lib/api/logging"
import { rateLimit } from "@/lib/rate-limit"
import { AUTH_ENDPOINT_RATE_LIMITS } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"

const verifyEmailTokenSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
})

async function handleVerifyEmail(request: NextRequest, token: string) {
  await auth.api.verifyEmail({
    headers: request.headers,
    query: {
      token,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Email verified successfully",
  })
}

function mapVerifyEmailError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ success: false, message: "Verification token is required" }, { status: 400 })
  }

  if (error instanceof Error && /invalid|expired|used|token/i.test(error.message)) {
    return NextResponse.json({ success: false, message: "Invalid or expired verification token" }, { status: 400 })
  }

  return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(
      request,
      "verify-email",
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].windowMs,
    )
    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "verify-email" })
      return NextResponse.json({ success: false, message: "Too many verification attempts. Please try again later." }, { status: 429 })
    }

    const parsed = verifyEmailTokenSchema.parse({ token: request.nextUrl.searchParams.get("token") })
    return handleVerifyEmail(request, parsed.token)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return mapVerifyEmailError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(
      request,
      "verify-email",
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].windowMs,
    )
    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "verify-email" })
      return NextResponse.json({ success: false, message: "Too many verification attempts. Please try again later." }, { status: 429 })
    }

    const parsed = verifyEmailTokenSchema.parse(await request.json())
    return handleVerifyEmail(request, parsed.token)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return mapVerifyEmailError(error)
  }
}
