import type { NextResponse } from "next/server"
import { isFeatureFlagEnabled } from "@/lib/feature-flags"

const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

type SessionCookieOptions = {
  secure: boolean
}

function buildCookieOptions({ secure }: SessionCookieOptions) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  }
}

export async function setSessionCookies(response: NextResponse, sessionToken: string) {
  const useBetterAuth = await isFeatureFlagEnabled("use_better_auth")
  const options = buildCookieOptions({ secure: process.env.NODE_ENV === "production" })

  response.cookies.set("better-auth.session-token", sessionToken, options)

  if (!useBetterAuth) {
    response.cookies.set("next-auth.session-token", sessionToken, options)
  } else {
    response.cookies.delete("next-auth.session-token")
    response.cookies.delete("__Secure-next-auth.session-token")
  }
}
