import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { createAIAgent, listAIAgents, type CreateAIAgentInput } from "@/lib/repositories/ai-agents"

export async function GET(request: NextRequest) {
  const auth = await authorizeRoute(request, "read")
  if (!auth.ok) return auth.response

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const agents = await listAIAgents(userId)
  return respondSuccess(request, agents, { legacy: { success: true, data: agents } })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRoute(request, "write", { writePermissions: ["content:write", "admin:access"] })
  if (!auth.ok) return auth.response

  const payload = (await request.json()) as Partial<CreateAIAgentInput> & { user_id?: string }
  const userId = resolveScopedUserId(request, auth.sessionUser)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  if (payload.user_id && payload.user_id !== userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const createPayload: CreateAIAgentInput = {
    name: payload.name ?? "Untitled Agent",
    type: payload.type ?? "engagement",
    status: payload.status ?? "idle",
    performance_score: payload.performance_score ?? 0,
    tasks_completed: payload.tasks_completed ?? 0,
    current_task: payload.current_task ?? null,
    enabled: payload.enabled ?? true,
    settings: payload.settings ?? {},
  }

  const agent = await createAIAgent(userId, createPayload)
  return respondSuccess(request, agent, { status: 201, legacy: { success: true, data: agent } })
}
