import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { setSessionCookies } from "@/lib/auth/cookies"
import { getAuthSecret } from "@/lib/auth"
import { verifyMagicLinkToken } from "@/lib/magic-link"
import { createUserSession } from "@/lib/auth-utils"
import { rateLimit } from "@/lib/rate-limit"
import { AUTH_ENDPOINT_RATE_LIMITS } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"
import { handleVerifyMagicLink } from "./verify-magic-link-handler"

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(
      request,
      "magic-link/verify",
      AUTH_ENDPOINT_RATE_LIMITS["magic-link/verify"].limit,
      AUTH_ENDPOINT_RATE_LIMITS["magic-link/verify"].windowMs,
    )
    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "magic-link/verify" })
      return NextResponse.json({ success: false, message: "Too many magic link attempts. Please try again later." }, { status: 429 })
    }

    return await handleVerifyMagicLink(request, {
      verifyMagicLinkToken,
      getAuthSecret,
      createUserSession,
      setSessionCookies,
    })
  } catch (error) {
    logApiRouteError(request, "auth.magic_link.verify_failed", error, { errorCode: "AUTH_MAGIC_LINK_VERIFY_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid token format" }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
