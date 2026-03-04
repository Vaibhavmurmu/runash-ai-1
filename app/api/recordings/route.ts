import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { CloudStorage } from "@/lib/cloud-storage"
import { getServerAuthSession } from "@/lib/auth/session"
import { handleGetRecordings } from "./recordings-route-handler"

export async function GET(req: NextRequest) {
  return handleGetRecordings(req, {
    getSession: getServerAuthSession,
    getRecordings: Database.getRecordings.bind(Database),
    getUserRecordings: Database.getUserRecordings.bind(Database),
    getSignedDownloadUrl: CloudStorage.getSignedDownloadUrl,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { streamId, duration } = await req.json()

    if (!streamId) {
      return NextResponse.json({ error: "Stream ID is required" }, { status: 400 })
    }

    const recording = await Database.createRecording({
      stream_id: streamId,
      duration: duration || 0,
      file_size: 0,
      file_url: "",
      thumbnail_url: null,
    })

    return NextResponse.json({ recording })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
