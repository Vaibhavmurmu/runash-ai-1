import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { snapshotRuntime } from "@/lib/stream-session-state"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 })

  const runtime = snapshotRuntime(params.id)
  const startedAt = stream.start_time ? new Date(stream.start_time) : null
  const durationSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0

  return NextResponse.json({
    metrics: {
      viewers: stream.viewer_count ?? 0,
      likes: runtime.likes,
      comments: runtime.comments,
      shares: runtime.shares,
      durationSeconds,
    },
  })
}
