import { NextRequest } from "next/server"
import { requireSellerOperation } from "@/app/api/seller/_auth"
import { formatZodIssues, liveStreamCreateRequestSchema } from "@/lib/api/contracts"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { liveStreamService, LiveStreamValidationError } from "@/services/live-stream/live-stream-service"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSellerOperation(request, "create_stream")
    if (auth instanceof Response) return auth
    const actorUserId = auth.userId

    const body = await request.json().catch(() => ({}))
    const parsed = liveStreamCreateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return respondError(
        request,
        {
          code: "INVALID_REQUEST",
          message: "Invalid create session payload",
          details: { issues: formatZodIssues(parsed.error) },
        },
        { status: 400 },
      )
    }

    const result = await liveStreamService.createDraftSession({
      ownerUserId: actorUserId,
      workspaceId: parsed.data.workspaceId,
      title: parsed.data.title,
      dvrEnabled: parsed.data.dvrEnabled,
      latencyProfile: parsed.data.latencyProfile,
    })

    return respondSuccess(request, result, { status: 201 })
  } catch (error) {
    if (error instanceof LiveStreamValidationError) {
      return respondError(request, { code: "LIVE_STREAM_VALIDATION_FAILED", message: error.message }, { status: error.statusCode })
    }

    return respondError(request, { code: "LIVE_STREAM_CREATE_FAILED", message: "Failed to create live stream session" }, { status: 500 })
  }
}
