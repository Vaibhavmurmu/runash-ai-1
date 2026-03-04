import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { createWorkflow, listWorkflowTemplates, listWorkflows } from "@/lib/repositories/automation"

export async function GET(request: NextRequest) {
  const auth = await authorizeRoute(request, "read")
  if (!auth.ok) return auth.response

  const type = request.nextUrl.searchParams.get("type")
  if (type === "templates") {
    const templates = await listWorkflowTemplates()
    return respondSuccess(request, templates, { legacy: { success: true, data: templates } })
  }

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const workflows = await listWorkflows(userId)
  return respondSuccess(request, workflows, { legacy: { success: true, data: workflows } })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as Record<string, unknown>
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.user_id)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const workflow = await createWorkflow(userId, payload)
  return respondSuccess(request, workflow, { status: 201, legacy: { success: true, data: workflow } })
}
