import { NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const stream = await Database.getStream(params.id)
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 })

  const viewerCount = stream.viewer_count ?? 0
  const status = viewerCount > 500 ? "Excellent" : viewerCount > 150 ? "Good" : viewerCount > 50 ? "Fair" : "Good"

  return NextResponse.json({
    telemetry: {
      status,
      bitrate: 5000,
      fps: 60,
      dropped: 0,
      latency: 1.2,
    },
  })
}
