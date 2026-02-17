import { type NextRequest, NextResponse } from "next/server"
import { verifyMagicLinkToken } from "@/lib/magic-link"
import { z } from "zod"
import { SignJWT } from "jose"
import { logApiRouteError } from "@/lib/api/logging"
import { setSessionCookies } from "@/lib/auth/cookies"

const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = verifySchema.parse(body)

    // Verify magic link token
    const { user, success } = await verifyMagicLinkToken(token)

    if (!success || !user) {
      return NextResponse.json({ error: "Invalid or expired magic link" }, { status: 400 })
    }

    // Create JWT session token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
    const sessionToken = await new SignJWT({
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret)

    // Set session cookie
    const response = NextResponse.json(
      {
        message: "Successfully signed in with magic link",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role,
        },
      },
      { status: 200 },
    )

    await setSessionCookies(response, sessionToken)

    return response
  } catch (error) {
    logApiRouteError(request, "auth.magic_link.verify_failed", error, { errorCode: "AUTH_MAGIC_LINK_VERIFY_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
