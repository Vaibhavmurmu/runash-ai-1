import { NextResponse, type NextRequest } from "next/server"
import type { Recording } from "@/lib/database"

type Session = { user: { id: string } } | null

export interface RecordingsRouteDependencies {
  getSession: () => Promise<Session>
  getRecordings: (streamId: string) => Promise<Recording[]>
  getUserRecordings: (userId: string) => Promise<Recording[]>
  getSignedDownloadUrl: (key: string, expiresInSeconds: number) => Promise<string>
}

function toPlaybackKey(fileUrl: string): string {
  return fileUrl.split("/").slice(-2).join("/")
}

function mapRecording(recording: Recording, playbackUrl: string | null) {
  return {
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
    streamId: recording.stream_id,
    userId: recording.user_id,
    viewCount: recording.view_count ?? 0,
    tags: recording.tags || [],
    isPublic: recording.privacy === "public",
    isProcessing: recording.status === "processing",
  }
}

export async function handleGetRecordings(req: NextRequest, deps: RecordingsRouteDependencies) {
  try {
    const session = await deps.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const streamId = searchParams.get("streamId")

    const recordings = streamId
      ? await deps.getRecordings(streamId)
      : await deps.getUserRecordings(session.user.id)

    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording) => {
        let playbackUrl: string | null = null
        if (recording.file_url) {
          try {
            playbackUrl = await deps.getSignedDownloadUrl(toPlaybackKey(recording.file_url), 3600)
          } catch {
            playbackUrl = null
          }
        }

        return mapRecording(recording, playbackUrl)
      }),
    )

    return NextResponse.json({ recordings: recordingsWithUrls })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
