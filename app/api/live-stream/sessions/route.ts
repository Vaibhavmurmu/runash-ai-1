import { NextRequest } from "next/server"
import { z } from "zod"

import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { liveStreamService, LiveStreamValidationError } from "@/services/live-stream/live-stream-service"
import { LIVE_STREAM_LATENCY_PROFILES } from "@/types/live-stream-domain"

const createSessionSchema = z.object({
  workspaceId: z.string().trim().max(128).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  dvrEnabled: z.boolean().optional(),
  latencyProfile: z.enum(LIVE_STREAM_LATENCY_PROFILES).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const actorUserId = await requireSellerSessionUserId(request)
    if (actorUserId instanceof Response) return actorUserId

    const body = await request.json().catch(() => ({}))
    const parsed = createSessionSchema.safeParse(body)
    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid create session payload" }, { status: 400 })
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
