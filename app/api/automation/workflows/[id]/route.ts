import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { deleteWorkflow, updateWorkflow } from "@/lib/repositories/automation"


export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const { id } = params
  const payload = (await request.json()) as Record<string, unknown>
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.user_id)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const workflow = await updateWorkflow(id, userId, payload)
  if (!workflow) {
    return respondError(
      request,
      { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" },
      { status: 404, legacy: { error: "Workflow not found" } },
    )
  }

  return respondSuccess(request, workflow, { legacy: { success: true, data: workflow } })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:delete", "admin:access"] })
  if (!auth.ok) return auth.response

  const { id } = params
  const userId = resolveScopedUserId(request, auth.sessionUser)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const deleted = await deleteWorkflow(id, userId)
  if (!deleted) {
    return respondError(
      request,
      { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" },
      { status: 404, legacy: { error: "Workflow not found" } },
    )
  }

  return respondSuccess(request, { id }, { legacy: { success: true, data: { id } } })
}
