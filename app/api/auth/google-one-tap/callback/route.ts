import { type NextRequest, NextResponse } from "next/server"
import { recordAuthMetric } from "@/lib/auth-observability"

interface OneTapPayload {
  credential?: string
  callbackUrl?: string
}

interface GoogleTokenInfoResponse {
  email?: string
  email_verified?: "true" | "false"
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OneTapPayload
  const credential = body.credential

  if (!credential) {
    return NextResponse.json({ error: "Missing one tap credential" }, { status: 400 })
  }

  const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)

  if (!tokenInfoResponse.ok) {
    recordAuthMetric("auth.google_one_tap.failed", { reason: "token_verification_failed" })
    return NextResponse.json({ error: "Invalid Google One Tap token" }, { status: 401 })
  }

  const tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfoResponse
  if (tokenInfo.email_verified !== "true") {
    recordAuthMetric("auth.google_one_tap.failed", { reason: "email_not_verified" })
    return NextResponse.json({ error: "Google account email must be verified" }, { status: 403 })
  }

  recordAuthMetric("auth.google_one_tap.success")

  const callbackUrl = body.callbackUrl?.startsWith("/") ? body.callbackUrl : "/dashboard"
  const redirectUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}&login_hint=${encodeURIComponent(tokenInfo.email ?? "")}`

  return NextResponse.json({ success: true, redirectUrl, email: tokenInfo.email })
}
