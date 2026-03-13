import { NextResponse, type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { listPlatformAnalytics } from "@/lib/repositories/multi-streaming"
import { platformAnalyticsListResponseSchema } from "@/lib/streaming/multi-platform-contracts"

function parseRangeHours(raw: string | null) {
  if (!raw) return 1
  const rangeToHours: Record<string, number> = {
    "15m": 0.25,
    "30m": 0.5,
    "1h": 1,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 168,
  }

  return rangeToHours[raw] ?? 1
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const rangeHours = parseRangeHours(req.nextUrl.searchParams.get("range"))
  const analytics = await listPlatformAnalytics({
    userId: session.user.id,
    platformId: id,
    rangeHours,
  })

  const validated = platformAnalyticsListResponseSchema.parse({ analytics })
  return NextResponse.json(validated)
}
