import { type NextRequest, NextResponse } from "next/server"
import { incrementUsage } from "@/lib/billing-usage"

export async function POST(req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const userId = req.headers.get("x-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Called every minute from the studio when live
  await incrementUsage({ userId, metric: "stream_minutes", amount: 1 })
  return NextResponse.json({ ok: true })
}
