import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

const DEFAULT_STORAGE_LIMIT = 50 * 1024 * 1024 * 1024

async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordings = await sql`
      SELECT file_size, created_at
      FROM recordings
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `

    const used = recordings.reduce((total, recording) => total + Number(recording.file_size || 0), 0)

    return NextResponse.json({
      usage: {
        used,
        total: DEFAULT_STORAGE_LIMIT,
        recordings: recordings.length,
        oldestRecordingDate: recordings.at(-1)?.created_at,
      },
    })
  } catch (error) {
    console.error("Get recording storage usage error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
