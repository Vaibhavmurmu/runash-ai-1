import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { CloudStorage } from "@/lib/cloud-storage"
import { getServerAuthSession } from "@/lib/auth/session"
import { handleGetRecording } from "./recording-detail-route-handler"

export async function GET(req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  return handleGetRecording(req, params, {
    getSession: getServerAuthSession,
    getRecording: Database.getRecording.bind(Database),
    getSignedDownloadUrl: CloudStorage.getSignedDownloadUrl,
  })
}

export async function PATCH(req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id
    const updateData = await req.json()

    const existingRecording = await Database.getRecording(recordingId)
    if (!existingRecording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (existingRecording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatedRecording = await Database.updateRecording(recordingId, {
      title: updateData.title,
      description: updateData.description,
      tags: updateData.tags,
      privacy: updateData.isPublic ? "public" : "private",
      thumbnail_url: updateData.thumbnailUrl,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ recording: updatedRecording })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id

    const existingRecording = await Database.getRecording(recordingId)
    if (!existingRecording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (existingRecording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (existingRecording.file_url) {
      try {
        const key = existingRecording.file_url.split("/").slice(-2).join("/")
        await CloudStorage.deleteFile(key)
      } catch {}
    }

    if (existingRecording.thumbnail_url) {
      try {
        const key = existingRecording.thumbnail_url.split("/").slice(-2).join("/")
        await CloudStorage.deleteFile(key)
      } catch {}
    }

    await Database.deleteRecording(recordingId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
