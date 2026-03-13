import { type NextRequest, NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"

type StreamingPlatformStatus = {
  id: string
  name: string
  platform_type: string
  is_connected: boolean
  connection_status: "connected" | "disconnected" | "error" | "testing"
}

function normalizeSelectedPlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

async function loadSessionPlatforms(sessionId: string, userId: string) {
  const stream = await Database.getStream(sessionId)
  if (!stream || String(stream.user_id) !== String(userId)) {
    return { error: NextResponse.json({ error: "Stream session not found" }, { status: 404 }) }
  }

  const platforms = await Database.query<StreamingPlatformStatus>(
    `
      SELECT
        sp.id,
        sp.name,
        sp.platform_type,
        sp.is_connected,
        CASE
          WHEN sp.last_connected > NOW() - INTERVAL '5 minutes' THEN 'connected'
          WHEN sp.last_connected IS NULL THEN 'disconnected'
          ELSE 'disconnected'
        END as connection_status
      FROM streaming_platforms sp
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
    `,
    [userId],
  )

  const metadata = ((stream.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>
  const selectedFromSession = normalizeSelectedPlatforms(metadata.selectedPlatformIds)
  const fallbackSelection = platforms.filter((platform) => platform.is_connected).map((platform) => platform.id)
  const selectedPlatformIds = selectedFromSession.length > 0 ? selectedFromSession : fallbackSelection

  return { stream, platforms, selectedPlatformIds }
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const state = await loadSessionPlatforms(params.id, session.user.id)
  if ("error" in state) return state.error

  return NextResponse.json({
    sessionId: params.id,
    selectedPlatformIds: state.selectedPlatformIds,
    platforms: state.platforms,
  })
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = await req.json().catch(() => null)
  const selectedPlatformIds = normalizeSelectedPlatforms(payload?.selectedPlatformIds)

  const state = await loadSessionPlatforms(params.id, session.user.id)
  if ("error" in state) return state.error

  const allowedPlatformIds = new Set(state.platforms.map((platform) => platform.id))
  const sanitizedSelection = selectedPlatformIds.filter((id) => allowedPlatformIds.has(id))

  await Database.updateStream(params.id, {
    metadata: {
      ...(((state.stream.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>),
      selectedPlatformIds: sanitizedSelection,
      selectedPlatformsUpdatedAt: new Date().toISOString(),
    },
  } as never)

  return NextResponse.json({
    sessionId: params.id,
    selectedPlatformIds: sanitizedSelection,
    platforms: state.platforms,
  })
}
