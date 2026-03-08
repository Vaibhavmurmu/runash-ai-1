import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { signTurnCredentials } from "@/lib/turn-credentials"

import { rateLimit } from "@/lib/rate-limit"

const TURN_SESSION_COOKIE_CANDIDATES = ["better-auth.session_token", "__Secure-better-auth.session_token", "next-auth.session-token"]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    const userId = session?.user?.id

    if (!userId) {
      console.warn("TURN credentials denied", { tags: ["turn_auth_failure", "auth_required"] })
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const rateLimitResult = await rateLimit(request, `turn-credentials:${userId}`, 20, 300)
    if (!rateLimitResult.success) {
      console.warn("TURN credentials denied", { tags: ["turn_auth_failure", "rate_limited"] })
      return NextResponse.json(
        {
          error: "Too many TURN credential requests. Please try again later.",
          retryAt: rateLimitResult.resetTime,
        },
        { status: 429 },
      )
    }

    const sessionId = TURN_SESSION_COOKIE_CANDIDATES.map((name) => request.cookies.get(name)?.value).find(Boolean)
    const signedCredentials = signTurnCredentials(userId, sessionId)

    console.info("TURN credentials issued", {
      tags: ["turn_credentials_issued"],
      ttl: signedCredentials.ttl,
    })

    return NextResponse.json(signedCredentials)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown"
    console.error("Error generating TURN credentials", {
      tags: ["turn_auth_failure", "turn_credentials_generation_error"],
      reason,
    })

    if (reason === "turn_secret_not_configured" || reason === "turn_urls_not_configured") {
      return NextResponse.json({ error: "TURN server is not configured" }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to generate TURN credentials" }, { status: 500 })
  }
}
