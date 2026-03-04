import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { resolveRequestId } from "@/lib/api/response"
import { listRecentModelDialogRuns } from "@/lib/repositories/model-dialog-runs"
import { requireDashboardSessionUserId } from "../../_auth"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const userId = await requireDashboardSessionUserId(request)
  if (userId instanceof Response) {
    return userId
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json(
      {
        requestId,
        status: "failed",
        output: null,
        error: {
          code: "MODEL_DIALOG_RECENT_INVALID_REQUEST",
          message: "Invalid recent model dialog query parameters.",
        },
      },
      { status: 400 },
    )
  }

  const runs = await listRecentModelDialogRuns(userId, parsed.data.limit)

  return NextResponse.json({
    requestId,
    status: "completed",
    output: { runs },
    error: null,
  })
}
