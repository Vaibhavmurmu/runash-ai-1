import type { NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { Database } from "@/lib/database"

const SUPPORTED_PLATFORMS = new Set(["twitch", "youtube", "facebook", "tiktok", "instagram", "linkedin"])

function toPlatformLabel(platform: string) {
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

function defaultSettings() {
  return {
    bitrate: 2500,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    audio_bitrate: 128,
    enable_chat_relay: false,
    enable_auto_title: false,
    enable_auto_description: false,
    privacy: "public",
    enable_recording: false,
    enable_notifications: true,
  }
}

export async function POST(req: NextRequest, { params }: { params: { platform: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
    }

    const platform = params.platform.toLowerCase()
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return respondError(req, { code: "STREAMING_PLATFORM_UNSUPPORTED", message: "Unsupported platform" }, { status: 400 })
    }

    const { code, state } = (await req.json()) as { code?: string; state?: string }
    if (!code || !state) {
      return respondError(
        req,
        { code: "STREAMING_PLATFORM_CALLBACK_INVALID", message: "Missing OAuth callback payload" },
        { status: 400 },
      )
    }

    const oauthToken = `${platform}_oauth_${crypto.randomUUID()}`
    const refreshToken = `${platform}_refresh_${crypto.randomUUID()}`

    const existing = await Database.query(
      `
      SELECT id
      FROM streaming_platforms
      WHERE user_id = $1 AND platform_type = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [session.user.id, platform],
    )

    const platformRows = existing[0]
      ? await Database.query(
          `
          UPDATE streaming_platforms
          SET oauth_token = $1, refresh_token = $2, is_connected = true, last_connected = NOW(), updated_at = NOW()
          WHERE id = $3 AND user_id = $4
          RETURNING *
        `,
          [oauthToken, refreshToken, existing[0].id, session.user.id],
        )
      : await Database.query(
          `
          INSERT INTO streaming_platforms (
            user_id,
            name,
            platform_type,
            rtmp_url,
            stream_key,
            is_active,
            is_connected,
            last_connected,
            settings,
            oauth_token,
            refresh_token
          ) VALUES ($1, $2, $3, $4, $5, true, true, NOW(), $6, $7, $8)
          RETURNING *
        `,
          [
            session.user.id,
            `${toPlatformLabel(platform)} Channel`,
            platform,
            `rtmp://live.${platform}.com/app`,
            "oauth-managed",
            JSON.stringify(defaultSettings()),
            oauthToken,
            refreshToken,
          ],
        )

    return respondSuccess(req, platformRows[0], { legacy: platformRows[0] })
  } catch {
    return respondError(req, { code: "STREAMING_PLATFORM_CALLBACK_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
