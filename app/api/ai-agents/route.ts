import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { createAIAgent, listAIAgents } from "@/lib/repositories/ai-agents"

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

  const payload = (await request.json()) as Record<string, unknown>
  const userId = resolveScopedUserId(request, auth.sessionUser, payload.user_id)

  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const agent = await createAIAgent(userId, payload)
  return respondSuccess(request, agent, { status: 201, legacy: { success: true, data: agent } })
}
