import { NextResponse } from "next/server"
import { createDashboardStreamInvite } from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "../utils"
import type { InviteCollaboratorRequest, InviteCollaboratorResponse } from "@/lib/types/dashboard-streams"

export async function POST(request: Request) {
  const scopedUserId = requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const body = (await request.json().catch(() => null)) as InviteCollaboratorRequest | null

  if (!body?.streamId || !body?.email) {
    return NextResponse.json({ error: "Missing streamId or email" }, { status: 400 })
  }

  const invite = await createDashboardStreamInvite(scopedUserId, body.streamId, body.email)

  const payload: InviteCollaboratorResponse = {
    ok: true,
    inviteId: invite.id,
    streamId: invite.stream_id,
    email: invite.email,
    sentAt: invite.sent_at,
  }

  return NextResponse.json(payload, { status: 201 })
}
