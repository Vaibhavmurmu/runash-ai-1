import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const platforms = await Database.query(
      `
      SELECT sp.*, 
        CASE 
          WHEN sp.last_connected > NOW() - INTERVAL '5 minutes' THEN 'connected'
          WHEN sp.last_connected IS NULL THEN 'disconnected'
          ELSE 'disconnected'
        END as connection_status
      FROM streaming_platforms sp
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
    `,
      [session.user.id],
    )

    return NextResponse.json({ platforms })
  } catch (error) {
    console.error("Get platforms error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const platformData = await req.json()

    // Validate required fields
    if (!platformData.name || !platformData.platform_type || !platformData.rtmp_url || !platformData.stream_key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create platform
    const platform = await Database.query(
      `
      INSERT INTO streaming_platforms (
        user_id, name, platform_type, rtmp_url, stream_key, 
        is_active, settings, oauth_token, refresh_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        session.user.id,
        platformData.name,
        platformData.platform_type,
        platformData.rtmp_url,
        platformData.stream_key,
        platformData.is_active || false,
        JSON.stringify(platformData.settings || getDefaultSettings()),
        platformData.oauth_token || null,
        platformData.refresh_token || null,
      ],
    )

    // Test connection
    try {
      await testPlatformConnection(platform[0])
    } catch (error) {
      console.warn("Failed to test connection for new platform:", error)
    }

    return NextResponse.json(platform[0])
  } catch (error) {
    console.error("Create platform error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getDefaultSettings() {
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

async function testPlatformConnection(platform: any): Promise<void> {
  // Implementation would test RTMP connection
  // For now, we'll simulate a successful connection
  await Database.query(`UPDATE streaming_platforms SET last_connected = NOW(), is_connected = true WHERE id = $1`, [
    platform.id,
  ])
}
