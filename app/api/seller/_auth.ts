import { getServerAuthSession } from "@/lib/auth/session"
import { respondError } from "@/lib/api/envelope"

type SellerSessionDependencies = {
  getSession: typeof getServerAuthSession
}

export async function requireSellerSessionUserId(
  request: Request,
  dependencies: Partial<SellerSessionDependencies> = {},
): Promise<number | Response> {
  const readSession = dependencies.getSession ?? getServerAuthSession
  const session = await readSession(request.headers)
  const rawUserId = session?.user?.id?.toString().trim()
  const sessionRole = session?.user?.role?.toString().trim().toLowerCase()

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

  if (sessionRole !== "seller" && sessionRole !== "admin" && sessionRole !== "super_admin") {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  return parsed
}
