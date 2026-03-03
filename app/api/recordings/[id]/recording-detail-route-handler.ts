import { NextResponse, type NextRequest } from "next/server"
import type { Recording } from "@/lib/database"

type Session = { user: { id: string } } | null

export interface RecordingDetailDependencies {
  getSession: () => Promise<Session>
  getRecording: (id: string) => Promise<Recording | null>
  getSignedDownloadUrl: (key: string, expiresInSeconds: number) => Promise<string>
}

function toPlaybackKey(fileUrl: string): string {
  return fileUrl.split("/").slice(-2).join("/")
}

export async function handleGetRecording(
  _req: NextRequest,
  params: { id: string },
  deps: RecordingDetailDependencies,
) {
  try {
    const session = await deps.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recording = await deps.getRecording(params.id)

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    if (recording.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let playbackUrl: string | null = null
    if (recording.file_url) {
      try {
        playbackUrl = await deps.getSignedDownloadUrl(toPlaybackKey(recording.file_url), 3600)
      } catch {
        playbackUrl = null
      }
    }

    return NextResponse.json({
      recording: {
        id: recording.id,
        title: recording.title,
        description: recording.description,
        duration: recording.duration,
        fileSize: recording.file_size || 0,
        thumbnailUrl: recording.thumbnail_url,
        recordingUrl: recording.file_url,
        playbackUrl,
        status: recording.status,
        quality: recording.quality,
        createdAt: recording.created_at,
        updatedAt: recording.updated_at,
        userId: recording.user_id,
        tags: recording.tags || [],
        isPublic: recording.privacy === "public",
        isProcessing: recording.status === "processing",
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
