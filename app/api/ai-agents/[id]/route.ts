import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { deleteAIAgent, updateAIAgent, type UpdateAIAgentInput } from "@/lib/repositories/ai-agents"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const { id } = params
  const payload = (await request.json()) as UpdateAIAgentInput & { user_id?: string }
  const userId = resolveScopedUserId(request, auth.sessionUser)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  if (payload.user_id && payload.user_id !== userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const { user_id: _userId, ...updates } = payload
  const updatedAgent = await updateAIAgent(id, userId, updates)
  if (!updatedAgent) {
    return respondError(
      request,
      { code: "AI_AGENT_NOT_FOUND", message: "Agent not found" },
      { status: 404, legacy: { error: "Agent not found" } },
    )
  }

  return respondSuccess(request, updatedAgent, { legacy: { success: true, data: updatedAgent } })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:delete", "admin:access"] })
  if (!auth.ok) return auth.response

  const { id } = params
  const userId = resolveScopedUserId(request, auth.sessionUser)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const deleted = await deleteAIAgent(id, userId)
  if (!deleted) {
    return respondError(
      request,
      { code: "AI_AGENT_NOT_FOUND", message: "Agent not found" },
      { status: 404, legacy: { error: "Agent not found" } },
    )
  }

  return respondSuccess(request, { id }, { legacy: { success: true, data: { id } } })
}
