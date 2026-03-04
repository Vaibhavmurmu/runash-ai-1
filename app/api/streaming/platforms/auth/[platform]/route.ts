import type { NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"

const SUPPORTED_PLATFORMS = new Set(["twitch", "youtube", "facebook", "tiktok", "instagram", "linkedin"])

export async function POST(req: NextRequest, { params }: { params: { platform: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  const platform = params.platform.toLowerCase()
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    return respondError(req, { code: "STREAMING_PLATFORM_UNSUPPORTED", message: "Unsupported platform" }, { status: 400 })
  }

  const state = crypto.randomUUID()
  const callbackUrl = new URL(`/api/streaming/platforms/auth/${platform}/callback`, req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

  const authUrl = new URL(`${appUrl}/oauth/${platform}/authorize`)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("redirect_uri", callbackUrl.toString())

  return respondSuccess(req, { auth_url: authUrl.toString() }, { legacy: { auth_url: authUrl.toString() } })
}
