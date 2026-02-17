import { NextResponse } from "next/server"
import { CloudStorage } from "@/lib/cloud-storage"
import { neon } from "@neondatabase/serverless"
import { getServerAuthSession } from "@/lib/auth/session"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recording = await sql`
      SELECT id, user_id, file_url
      FROM recordings
      WHERE id = ${params.id}
      LIMIT 1
    `

    if (!recording[0]) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (recording[0].user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!recording[0].file_url) {
      return NextResponse.json({ error: "Recording file not available" }, { status: 404 })
    }

    const key = recording[0].file_url.split("/").slice(-2).join("/")
    const downloadUrl = await CloudStorage.getSignedDownloadUrl(key, 300)

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error("Download recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
