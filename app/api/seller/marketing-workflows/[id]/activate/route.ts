import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { setMarketingWorkflowRuleActivation } from "@/lib/repositories/marketing-workflows"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as { is_active?: boolean; seller_user_id?: string }
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.seller_user_id)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const workflow = await setMarketingWorkflowRuleActivation(params.id, userId, payload.is_active ?? true)
  if (!workflow) {
    return respondError(request, { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" }, { status: 404 })
  }

  return respondSuccess(request, workflow)
}
