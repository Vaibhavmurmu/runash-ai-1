import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { processMarketingTrigger } from "@/lib/marketing-workflows/orchestration-service"
import type { MarketingTriggerType } from "@/lib/repositories/marketing-workflows"

export async function POST(request: NextRequest) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as {
    seller_user_id?: string
    type: MarketingTriggerType
    recipient_user_id: string
    recipient_email?: string
    event_payload?: Record<string, unknown>
  }

  const userId = resolveScopedUserId(request, auth.sessionUser, payload.seller_user_id)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const result = await processMarketingTrigger({
    sellerUserId: userId,
    type: payload.type,
    recipientUserId: payload.recipient_user_id,
    recipientEmail: payload.recipient_email,
    payload: payload.event_payload ?? {},
  })

  return respondSuccess(request, result)
}
