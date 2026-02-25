import { getServerAuthSession } from "@/lib/auth/session"
import { respondError } from "@/lib/api/envelope"

export async function requireSellerSessionUserId(request: Request): Promise<number | Response> {
  const session = await getServerAuthSession(request.headers)
  const rawUserId = session?.user?.id?.toString().trim()

  if (!rawUserId) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401, legacy: { error: "Unauthorized" } })
  }

  const parsed = Number.parseInt(rawUserId, 10)
  if (Number.isNaN(parsed)) {
    return respondError(request, { code: "INVALID_SESSION_USER", message: "Invalid session user id" }, { status: 403, legacy: { error: "Invalid session user id" } })
  }

  const scopedHeaderUserId = request.headers.get("x-user-id")?.trim()
  if (scopedHeaderUserId && scopedHeaderUserId !== rawUserId) {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  return parsed
}
