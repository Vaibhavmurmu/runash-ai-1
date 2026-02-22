import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { listRecentModelDialogRuns } from "@/lib/repositories/model-dialog-runs"
import { requireDashboardSessionUserId } from "../../_auth"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export async function GET(request: NextRequest) {
  const userId = await requireDashboardSessionUserId(request)
  if (userId instanceof Response) {
    return userId
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  const limit = parsed.success ? parsed.data.limit : 5
  const runs = await listRecentModelDialogRuns(userId, limit)

  return NextResponse.json({ runs })
}
