import { NextResponse } from "next/server"
import { invalidateUserSessions } from "@/lib/auth-utils"
import { AUTH_COOKIE_NAMES } from "@/lib/auth"

type SessionInvalidationReason = "password_change" | "password_reset" | "api_key_rotated" | "manual_revoke"

export async function invalidateSensitiveActionSessions(userId: number, reason: SessionInvalidationReason) {
  await invalidateUserSessions(userId, reason)
}

export function attachSessionRevocationCookies(response: NextResponse): NextResponse {
  AUTH_COOKIE_NAMES.forEach((cookieName) => {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      secure: cookieName.startsWith("__Secure-"),
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    })
  })

  return response
}

