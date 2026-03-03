import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth, emailVerificationCallbackURL } from "@/lib/auth"
import { logApiRouteError } from "@/lib/api/logging"
import { rateLimit } from "@/lib/rate-limit"
import { AUTH_ENDPOINT_RATE_LIMITS } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
  callbackURL: z.string().trim().url().optional(),
})

type VerifyEmailDependencies = {
  enforceRateLimit: typeof rateLimit
  verifyEmail: (input: { headers: Headers; query: { token: string; callbackURL?: string } }) => Promise<unknown>
}

const defaultDependencies: VerifyEmailDependencies = {
  enforceRateLimit: rateLimit,
  verifyEmail: (input) => auth.api.verifyEmail(input),
}

function resolveCallbackURL(input: string | null | undefined): string | undefined {
  if (!input) {
    return undefined
  }

  try {
    return new URL(input).toString()
  } catch {
    return undefined
  }
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

async function handleVerifyEmail(
  request: NextRequest,
  input: { token: string; callbackURL?: string },
  dependencies: VerifyEmailDependencies,
) {
  await dependencies.verifyEmail({
    headers: request.headers,
    query: {
      token: input.token,
      callbackURL: input.callbackURL,
    },
  })

  const redirectTarget = input.callbackURL ?? emailVerificationCallbackURL

  if (redirectTarget) {
    return NextResponse.redirect(redirectTarget)
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully",
  })
}

export async function handleVerifyEmailGet(
  request: NextRequest,
  dependencies: VerifyEmailDependencies = defaultDependencies,
): Promise<Response> {
  try {
    const rateLimitResult = await dependencies.enforceRateLimit(
      request,
      "verify-email",
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].windowMs,
    )
    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "verify-email" })
      return NextResponse.json({ success: false, message: "Too many verification attempts. Please try again later." }, { status: 429 })
    }

    const parsed = verifyEmailSchema.parse({
      token: request.nextUrl.searchParams.get("token"),
      callbackURL: resolveCallbackURL(request.nextUrl.searchParams.get("callbackURL")),
    })

    return await handleVerifyEmail(request, parsed, dependencies)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return mapVerifyEmailError(error)
  }
}

export async function handleVerifyEmailPost(
  request: NextRequest,
  dependencies: VerifyEmailDependencies = defaultDependencies,
): Promise<Response> {
  try {
    const rateLimitResult = await dependencies.enforceRateLimit(
      request,
      "verify-email",
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["verify-email"].windowMs,
    )
    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "verify-email" })
      return NextResponse.json({ success: false, message: "Too many verification attempts. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = verifyEmailSchema.parse({
      token: body?.token,
      callbackURL: resolveCallbackURL(body?.callbackURL),
    })

    return await handleVerifyEmail(request, parsed, dependencies)
  } catch (error) {
    logApiRouteError(request, "auth.verify_email.failed", error, { errorCode: "AUTH_VERIFY_EMAIL_FAILED" })
    return mapVerifyEmailError(error)
  }
}
