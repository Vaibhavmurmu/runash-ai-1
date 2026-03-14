import { NextResponse } from "next/server"
import { sql } from "@/lib/db"


async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

export async function POST(req: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recording = await sql`
      SELECT id, user_id
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

    await sql`
      UPDATE recordings
      SET privacy = 'public', updated_at = NOW()
      WHERE id = ${params.id}
    `

    const url = new URL(req.url)
    const shareUrl = `${url.origin}/recordings/${params.id}`

    return NextResponse.json({ shareUrl })
  } catch (error) {
    console.error("Share recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
