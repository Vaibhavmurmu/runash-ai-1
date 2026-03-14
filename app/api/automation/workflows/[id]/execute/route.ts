import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { createWorkflowExecution } from "@/lib/repositories/automation"


export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = (await request.json()) as { user_id?: string; input_data?: Record<string, unknown> }
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.user_id)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const execution = await createWorkflowExecution(id, userId, payload.input_data ?? {})
  if (!execution) {
    return respondError(
      request,
      { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" },
      { status: 404, legacy: { error: "Workflow not found" } },
    )
  }

  return respondSuccess(request, execution, { status: 201, legacy: { success: true, data: execution } })
}
