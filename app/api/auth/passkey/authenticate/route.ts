import { type NextRequest, NextResponse } from "next/server"
import { generatePasskeyAuthenticationOptions, verifyPasskeyAuthentication } from "@/lib/passkey"
import { SignJWT } from "jose"
import { z } from "zod"
import { logApiRouteError } from "@/lib/api/logging"
import { setSessionCookies } from "@/lib/auth/cookies"

const authenticationSchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().nullable().optional(),
    }),
    type: z.literal("public-key"),
  }),
  expectedChallenge: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    const options = await generatePasskeyAuthenticationOptions(email || undefined)

    return NextResponse.json(options)
  } catch (error) {
    logApiRouteError(request, "auth.passkey.authenticate.options_failed", error, { errorCode: "AUTH_PASSKEY_AUTH_OPTIONS_FAILED" })
    return NextResponse.json({ error: "Failed to generate authentication options" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { response, expectedChallenge } = authenticationSchema.parse(body)

    const result = await verifyPasskeyAuthentication(response, expectedChallenge)

    if (result.verified && result.user) {
      // Create JWT session token
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      const sessionToken = await new SignJWT({
        sub: result.user.id.toString(),
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret)

      // Set session cookie
      const response = NextResponse.json({
        message: "Successfully authenticated with passkey",
        user: result.user,
      })

      await setSessionCookies(response, sessionToken)

      return response
    }

    return NextResponse.json({ error: "Failed to verify passkey authentication" }, { status: 400 })
  } catch (error) {
    logApiRouteError(request, "auth.passkey.authenticate.verify_failed", error, { errorCode: "AUTH_PASSKEY_AUTH_VERIFY_FAILED" })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
