import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import type { StudioRecordingPayload } from "@/lib/analytics-pro"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const recordings = await Database.getRecordings(params.id)

  return NextResponse.json({
    recordings: recordings.map((recording) => ({
      id: recording.id,
      streamId: recording.stream_id,
      fileUrl: recording.file_url,
      duration: recording.duration,
      fileSize: recording.file_size,
      createdAt: recording.created_at,
    })),
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as Partial<StudioRecordingPayload>

  const storage = body.storage === "local" ? "local" : "cloud"
  const title = body.title?.trim() || `Live recording ${new Date().toLocaleString()}`
  const durationSeconds = Math.max(1, Number(body.durationSeconds ?? 90))
  const includeTranscript = Boolean(body.includeTranscript)

  const recording = await Database.createRecording({
    stream_id: params.id,
    duration: durationSeconds,
    file_size: Math.round(durationSeconds * (storage === "cloud" ? 1024 * 60 : 1024 * 40)),
    file_url: `${storage}://stream-recordings/${params.id}/${Date.now()}.mp4`,
    thumbnail_url: null,
  })

  return NextResponse.json({
    recording: {
      ...recording,
      title,
      storage,
      transcriptStatus: includeTranscript ? "queued" : "disabled",
    },
  })
}
