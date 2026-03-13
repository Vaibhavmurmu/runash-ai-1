import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { deleteMarketingWorkflowRule, getMarketingWorkflowRule, updateMarketingWorkflowRule } from "@/lib/repositories/marketing-workflows"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const auth = await authorizeRoute(request, "read")
  if (!auth.ok) return auth.response

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const workflow = await getMarketingWorkflowRule(params.id, userId)
  if (!workflow) {
    return respondError(request, { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" }, { status: 404 })
  }

  return respondSuccess(request, workflow)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as Record<string, unknown>
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.seller_user_id)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const workflow = await updateMarketingWorkflowRule(params.id, userId, payload)
  if (!workflow) {
    return respondError(request, { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" }, { status: 404 })
  }

  return respondSuccess(request, workflow)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:delete", "admin:access"] })
  if (!auth.ok) return auth.response

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const deleted = await deleteMarketingWorkflowRule(params.id, userId)
  if (!deleted) {
    return respondError(request, { code: "WORKFLOW_NOT_FOUND", message: "Workflow not found" }, { status: 404 })
  }

  return respondSuccess(request, { id: params.id })
}
