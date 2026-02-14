import { type NextRequest, NextResponse } from "next/server"
import { createMagicLinkToken, sendMagicLink } from "@/lib/magic-link"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"

const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "magic-link", 3, 300) // 3 requests per 5 minutes
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const { email } = magicLinkSchema.parse(body)

    // Create magic link token
    const result = await createMagicLinkToken(email)

    if (!result) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: "If an account with this email exists, we've sent you a magic link." },
        { status: 200 },
      )
    }

    // Send magic link email
    const emailSent = await sendMagicLink(email, result.token, result.user.name)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send magic link. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ message: "Magic link sent! Check your email to sign in." }, { status: 200 })
  } catch (error) {
    logApiRouteError(request, "auth.magic_link.request_failed", error, { errorCode: "AUTH_MAGIC_LINK_REQUEST_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
