import type { NextResponse } from "next/server"
import { AUTH_COOKIE_NAMES } from "@/lib/auth"

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

export function setSessionCookies(response: NextResponse, sessionToken: string) {
  const options = buildCookieOptions({ secure: process.env.NODE_ENV === "production" })

  response.cookies.set(AUTH_COOKIE_NAMES[0], sessionToken, options)
  response.cookies.delete("next-auth.session-token")
  response.cookies.delete("__Secure-next-auth.session-token")
}
