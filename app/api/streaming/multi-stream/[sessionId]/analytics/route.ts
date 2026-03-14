import { NextResponse, type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { getMultiStreamSession, listSessionPlatformAnalytics } from "@/lib/repositories/multi-streaming"
import { multiStreamAnalyticsResponseSchema } from "@/lib/streaming/multi-platform-contracts"

const streamHealthWeight = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
} as const

const streamHealthLabels = {
  4: "excellent",
  3: "good",
  2: "fair",
  1: "poor",
} as const

export async function GET(req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ sessionId: string }> }) {
  const params = await routeParamsPromise
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const streamSession = await getMultiStreamSession(params.sessionId, session.user.id)
  if (!streamSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const platforms = await listSessionPlatformAnalytics({
    userId: session.user.id,
    sessionId: params.sessionId,
  })

  const totalHealthWeight = platforms.reduce((sum, platform) => sum + streamHealthWeight[platform.stream_health], 0)
  const averageWeight = platforms.length === 0 ? 3 : Math.round(totalHealthWeight / platforms.length)

  const responsePayload = {
    session: streamSession,
    platforms,
    aggregated: {
      total_viewers: platforms.reduce((sum, platform) => sum + platform.viewers, 0),
      total_chat_messages: platforms.reduce((sum, platform) => sum + platform.chat_messages, 0),
      total_engagement: platforms.reduce((sum, platform) => sum + platform.engagement_rate, 0),
      average_stream_health: streamHealthLabels[averageWeight as 1 | 2 | 3 | 4],
    },
  }

  const validated = multiStreamAnalyticsResponseSchema.parse(responsePayload)
  return NextResponse.json(validated)
}
