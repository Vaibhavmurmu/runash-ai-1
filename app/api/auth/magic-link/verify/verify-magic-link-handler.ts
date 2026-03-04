import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { z } from "zod"

const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export type VerifyMagicLinkDependencies = {
  verifyMagicLinkToken: (token: string) => Promise<{ user: any; success: boolean }>
  getAuthSecret: () => string
  createUserSession: (
    userId: number,
    sessionToken: string,
    expires: Date,
    metadata?: { ipAddress?: string; userAgent?: string },
  ) => Promise<boolean>
  setSessionCookies: (response: NextResponse, sessionToken: string) => void
}

export async function handleVerifyMagicLink(request: Request, deps: VerifyMagicLinkDependencies) {
  const body = await request.json()
  const { token } = verifySchema.parse(body)

  const { user, success } = await deps.verifyMagicLinkToken(token)
  if (!success || !user) {
    return NextResponse.json({ success: false, message: "Invalid or expired magic link" }, { status: 400 })
  }

  const issuedAtEpoch = Math.floor(Date.now() / 1000)
  const expiresAtEpoch = issuedAtEpoch + 30 * 24 * 60 * 60
  const expiresAt = new Date(expiresAtEpoch * 1000)

  const secret = new TextEncoder().encode(deps.getAuthSecret())
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
  const clientIP = forwardedFor ? forwardedFor.split(",")[0]?.trim() : request.headers.get("x-real-ip") ?? undefined
  const userAgent = request.headers.get("user-agent") ?? undefined

  await deps.createUserSession(user.id, sessionToken, expiresAt, { ipAddress: clientIP, userAgent })

  const response = NextResponse.json(
    {
      success: true,
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

  deps.setSessionCookies(response, sessionToken)
  return response
}
