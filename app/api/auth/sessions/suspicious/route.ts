import { NextRequest, NextResponse } from "next/server"
import { detectAndChallengeLogin, verifyLoginChallenge } from "@/lib/auth/suspicious-login-detector"
import { rateLimit } from "@/lib/security/rate-limiter"

export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

    // Rate limit by IP
    const rateLimitResult = await rateLimit(`suspicious-login:${clientIp}`, 10, 60) // 10 requests per minute

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { action, userId, userAgent } = body

    if (action === "detect") {
      // Detect suspicious login
      if (!userId || !userAgent) {
        return NextResponse.json({ error: "Missing required fields: userId, userAgent" }, { status: 400 })
      }

      const { analysis, challenge } = await detectAndChallengeLogin(userId, clientIp, userAgent)

      return NextResponse.json({
        success: true,
        analysis,
        challenge: challenge
          ? {
              sessionId: challenge.sessionId,
              challengeType: challenge.challengeType,
              token: challenge.challengeToken,
              expiresAt: challenge.expiresAt,
              riskScore: challenge.riskScore,
              reasons: challenge.reasons,
            }
          : null,
      })
    } else if (action === "verify") {
      // Verify challenge response
      const { sessionId, token, challengeType, verificationCode } = body

      if (!sessionId || !token || !challengeType || !verificationCode) {
        return NextResponse.json(
          { error: "Missing required fields for verification" },
          { status: 400 },
        )
      }

      const isVerified = await verifyLoginChallenge(sessionId, token, verificationCode, challengeType)

      return NextResponse.json({
        success: true,
        verified: isVerified,
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Suspicious login API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get list of suspicious logins for authenticated user
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

    const rateLimitResult = await rateLimit(`suspicious-login-list:${clientIp}`, 30, 60)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      )
    }

    // In a real app, verify the user's session here
    // and only return their own suspicious logins

    return NextResponse.json({
      error: "Requires authentication",
    })
  } catch (error) {
    console.error("[v0] Error fetching suspicious logins:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
