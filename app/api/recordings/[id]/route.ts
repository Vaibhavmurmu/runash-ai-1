import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { CloudStorage } from "@/lib/cloud-storage"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id
    const recording = await Database.getRecording(recordingId)

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Check if user owns this recording
    if (recording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate signed URL if recording exists
    let playbackUrl = null
    if (recording.recording_url) {
      try {
        const key = recording.recording_url.split("/").slice(-2).join("/")
        playbackUrl = await CloudStorage.getSignedDownloadUrl(key, 3600)
      } catch (error) {
        console.error("Failed to generate signed URL:", error)
      }
    }

    const recordingData = {
      id: recording.id,
      title: recording.title,
      description: recording.description,
      duration: recording.duration,
      fileSize: recording.file_size || 0,
      thumbnailUrl: recording.thumbnail_url,
      recordingUrl: recording.recording_url,
      playbackUrl,
      status: recording.status,
      quality: recording.quality,
      createdAt: recording.created_at,
      updatedAt: recording.updated_at,
      userId: recording.user_id,
      tags: recording.tags || [],
      isPublic: recording.privacy === "public",
      isProcessing: recording.status === "processing",
    }

    return NextResponse.json({ recording: recordingData })
  } catch (error) {
    console.error("Get recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id
    const updateData = await req.json()

    // Get existing recording to check ownership
    const existingRecording = await Database.getRecording(recordingId)
    if (!existingRecording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (existingRecording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update recording
    const updatedRecording = await Database.updateRecording(recordingId, {
      title: updateData.title,
      description: updateData.description,
      tags: updateData.tags,
      privacy: updateData.isPublic ? "public" : "private",
      thumbnail_url: updateData.thumbnailUrl,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ recording: updatedRecording })
  } catch (error) {
    console.error("Update recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id

    // Get existing recording to check ownership and get file URLs
    const existingRecording = await Database.getRecording(recordingId)
    if (!existingRecording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (existingRecording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete files from cloud storage
    if (existingRecording.recording_url) {
      try {
        const key = existingRecording.recording_url.split("/").slice(-2).join("/")
        await CloudStorage.deleteFile(key)
      } catch (error) {
        console.error("Failed to delete recording file:", error)
      }
    }

    if (existingRecording.thumbnail_url) {
      try {
        const key = existingRecording.thumbnail_url.split("/").slice(-2).join("/")
        await CloudStorage.deleteFile(key)
      } catch (error) {
        console.error("Failed to delete thumbnail file:", error)
      }
    }

    // Delete recording from database
    await Database.deleteRecording(recordingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
