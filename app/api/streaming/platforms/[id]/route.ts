import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { Database } from "@/lib/database"

const UPDATABLE_FIELDS = new Set([
  "name",
  "platform_type",
  "rtmp_url",
  "stream_key",
  "is_active",
  "is_connected",
  "last_connected",
  "settings",
  "oauth_token",
  "refresh_token",
])

function buildPlatformProjection() {
  return `
    sp.*,
    CASE
      WHEN sp.last_connected > NOW() - INTERVAL '5 minutes' THEN 'connected'
      WHEN sp.last_connected IS NULL THEN 'disconnected'
      ELSE 'disconnected'
    END as connection_status
  `
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
    }

    const updates = (await req.json()) as Record<string, unknown>
    const entries = Object.entries(updates).filter(([field, value]) => UPDATABLE_FIELDS.has(field) && value !== undefined)

    if (entries.length === 0) {
      return respondError(req, { code: "STREAMING_PLATFORM_INVALID_UPDATE", message: "No valid fields provided" }, { status: 400 })
    }

    const setClauses = entries.map(([field], index) => `${field} = $${index + 1}`)
    const values = entries.map(([field, value]) => (field === "settings" && value ? JSON.stringify(value) : value))

    const updated = await Database.query(
      `
      UPDATE streaming_platforms
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING *
    `,
      [...values, params.id, session.user.id],
    )

    if (!updated[0]) {
      return respondError(req, { code: "STREAMING_PLATFORM_NOT_FOUND", message: "Platform not found" }, { status: 404 })
    }

    const platformWithStatus = await Database.query(
      `
      SELECT ${buildPlatformProjection()}
      FROM streaming_platforms sp
      WHERE sp.id = $1 AND sp.user_id = $2
    `,
      [params.id, session.user.id],
    )

    return respondSuccess(req, platformWithStatus[0], { legacy: platformWithStatus[0] })
  } catch {
    return respondError(req, { code: "STREAMING_PLATFORM_UPDATE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
    }

    const deleted = await Database.query(
      `
      DELETE FROM streaming_platforms
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
      [params.id, session.user.id],
    )

    if (!deleted[0]) {
      return respondError(req, { code: "STREAMING_PLATFORM_NOT_FOUND", message: "Platform not found" }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return respondError(req, { code: "STREAMING_PLATFORM_DELETE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
