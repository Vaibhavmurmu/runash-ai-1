import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import {
  createMarketingWorkflowRule,
  createMarketingWorkflowTemplate,
  listMarketingWorkflowRuns,
  listMarketingWorkflowRules,
  listMarketingWorkflowTemplates,
} from "@/lib/repositories/marketing-workflows"

export async function GET(request: NextRequest) {
  const auth = await authorizeRoute(request, "read")
  if (!auth.ok) return auth.response

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  const type = request.nextUrl.searchParams.get("type")
  if (type === "templates") {
    const templates = await listMarketingWorkflowTemplates(userId)
    return respondSuccess(request, templates)
  }

  if (type === "runs") {
    const runs = await listMarketingWorkflowRuns(userId)
    return respondSuccess(request, runs)
  }

  const workflows = await listMarketingWorkflowRules(userId)
  return respondSuccess(request, workflows)
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as Record<string, unknown>
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.seller_user_id)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403 })
  }

  if (payload.type === "template") {
    const template = await createMarketingWorkflowTemplate(userId, payload)
    if (!template) {
      return respondError(request, { code: "TEMPLATE_CREATE_FAILED", message: "Unable to create template" }, { status: 400 })
    }

    return respondSuccess(request, template, { status: 201 })
  }

  const workflow = await createMarketingWorkflowRule(userId, payload)
  if (!workflow) {
    return respondError(request, { code: "WORKFLOW_CREATE_FAILED", message: "Unable to create workflow" }, { status: 400 })
  }

  return respondSuccess(request, workflow, { status: 201 })
}
