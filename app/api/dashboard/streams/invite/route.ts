import { respondError, respondSuccess } from "@/lib/api/envelope"
import { createDashboardStreamInvite } from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "../utils"
import type { InviteCollaboratorRequest, InviteCollaboratorResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request.json().catch(() => null)) as InviteCollaboratorRequest | null

  if (!body?.streamId || !body?.email) {
    return respondError(request, { code: "INVALID_INVITE_REQUEST", message: "Missing streamId or email" }, { status: 400, legacy: { error: "Missing streamId or email" } })
  }

  const invite = await createDashboardStreamInvite(scopedUserId, body.streamId, body.email)

  const payload: InviteCollaboratorResponse = {
    ok: true,
    inviteId: invite.id,
    streamId: invite.stream_id,
    email: invite.email,
    sentAt: invite.sent_at,
  }

  return respondSuccess(request, payload, { status: 201, legacy: payload })
}
