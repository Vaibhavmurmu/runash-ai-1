import { type NextRequest, NextResponse } from "next/server"
import { createAnonymousIdentity, createAuthSession } from "@/lib/auth/session-modes"

export async function POST(request: NextRequest) {
  const anonymousId = await createAnonymousIdentity()
  const session = await createAuthSession({
    userId: anonymousId,
    mode: "cookie",
    scope: "anonymous",
    device: {
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      deviceName: request.headers.get("sec-ch-ua-platform"),
    },
    ttlMinutes: 60 * 24,
  })

  const response = NextResponse.json({
    anonymousId,
    canLinkAccountLater: true,
    session,
  })

  response.cookies.set({
    name: "runash_anon_session",
    value: session.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  })

  return response
}
