import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authorizeRoute, resolveScopedUserId } from "@/lib/api/route-auth"
import { listWorkflowExecutions } from "@/lib/repositories/automation"

export async function GET(request: NextRequest) {
  const auth = await authorizeRoute(request, "read")
  if (!auth.ok) return auth.response

  const userId = resolveScopedUserId(request, auth.sessionUser)
  if (!userId) {
    return respondError(request, { code: "AUTH_FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)
  const executions = await listWorkflowExecutions(userId, Number.isFinite(limit) ? limit : 50)
  return respondSuccess(request, executions, { legacy: { success: true, data: executions } })
}
