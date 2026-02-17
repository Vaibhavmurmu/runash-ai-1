import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const streamId = Number.parseInt(params.id)
    const stream = await Database.getStreamById(streamId)

    if (!stream || stream.user_id !== session.user.id) {
      return NextResponse.json({ error: "Stream not found or unauthorized" }, { status: 404 })
    }

    // Get real-time analytics
    const activeViewers = await Database.getActiveViewers(streamId)
    const recentChat = await Database.getStreamChat(streamId, 50)

    const analytics = {
      streamId,
      currentViewers: activeViewers[0]?.count || 0,
      totalViews: stream.total_views || 0,
      peakViewers: stream.peak_viewers || 0,
      averageViewers: stream.average_viewers || 0,
      watchTime: stream.watch_time || 0,
      chatMessages: stream.chat_messages || 0,
      newFollowers: stream.new_followers || 0,
      donations: stream.donations || 0,
      engagement: stream.engagement || 0,
      recentChatActivity: recentChat.length,
      streamHealth: calculateStreamHealth(stream),
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Get stream analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateStreamHealth(stream: any): "Excellent" | "Good" | "Fair" | "Poor" {
  const bitrate = stream.bitrate || 0
  const droppedFrames = stream.dropped_frames || 0

  if (droppedFrames > 3 || bitrate < 2000) return "Poor"
  if (droppedFrames > 1 || bitrate < 2200) return "Fair"
  if (droppedFrames > 0 || bitrate < 2400) return "Good"
  return "Excellent"
}
