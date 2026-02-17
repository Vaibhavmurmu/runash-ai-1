import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { CloudStorage } from "@/lib/cloud-storage"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const streamId = searchParams.get("streamId")
    const userId = session.user.id

    let recordings
    if (streamId) {
      recordings = await Database.getRecordings(streamId)
    } else {
      recordings = await Database.getUserRecordings(userId)
    }

    // Generate signed URLs for each recording
    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording) => {
        let playbackUrl = null
        if (recording.recording_url) {
          try {
            const key = recording.recording_url.split("/").slice(-2).join("/") // Extract key from URL
            playbackUrl = await CloudStorage.getSignedDownloadUrl(key, 3600)
          } catch (error) {
            console.error("Failed to generate signed URL:", error)
          }
        }

        return {
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
          streamId: recording.id,
          userId: recording.user_id,
          viewCount: 0, // Will be tracked separately
          tags: recording.tags || [],
          isPublic: recording.privacy === "public",
          isProcessing: recording.status === "processing",
        }
      }),
    )

    return NextResponse.json({ recordings: recordingsWithUrls })
  } catch (error) {
    console.error("Get recordings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, streamId, duration, quality = "1080p" } = await req.json()

    if (!title || !streamId) {
      return NextResponse.json({ error: "Title and stream ID are required" }, { status: 400 })
    }

    const recording = await Database.createRecording({
      title,
      description: description || "",
      user_id: session.user.id,
      duration: duration || 0,
      quality,
      status: "scheduled",
      privacy: "private",
      recording_enabled: true,
    })

    return NextResponse.json({ recording })
  } catch (error) {
    console.error("Create recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
