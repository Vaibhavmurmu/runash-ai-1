import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recordingId, clip } = await req.json()

    if (!recordingId || !clip?.title) {
      return NextResponse.json({ error: "Invalid clip payload" }, { status: 400 })
    }

    const recording = await sql`
      SELECT id, user_id
      FROM recordings
      WHERE id = ${recordingId}
      LIMIT 1
    `

    if (!recording[0]) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (recording[0].user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      clip: {
        ...clip,
        recordingId,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Create recording clip error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
