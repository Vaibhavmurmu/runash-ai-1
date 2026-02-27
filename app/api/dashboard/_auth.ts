import { getServerAuthSession } from "@/lib/auth/session"
import { respondError } from "@/lib/api/envelope"

export async function requireDashboardSessionUserId(request: Request): Promise<string | Response> {
  const session = await getServerAuthSession(request.headers)
  const sessionUserId = session?.user?.id?.toString().trim()

  if (!sessionUserId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401, legacy: { error: "Unauthorized" } })
  }

  const scopedHeaderUserId = request.headers.get("x-user-id")?.trim()
  if (scopedHeaderUserId && scopedHeaderUserId !== sessionUserId) {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  return sessionUserId

}
