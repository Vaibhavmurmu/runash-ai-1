import { getServerAuthSession } from "@/lib/auth/session"
import { respondError } from "@/lib/api/envelope"
import { authorizeTenantOperation, recordPrivilegedOperationLog, toPolicyDeniedResponse } from "@/lib/authz/live-policy"
import type { LiveEditorOperation } from "@/types/auth"

type SellerSessionDependencies = {
  getSession: typeof getServerAuthSession
}

export type SellerAuthContext = {
  userId: number
  role: string
  tenantId: string
}

export async function requireSellerSessionUserId(
  request: Request,
  dependencies: Partial<SellerSessionDependencies> = {},
): Promise<number | Response> {
  const auth = await requireSellerSessionContext(request, dependencies)
  if (auth instanceof Response) return auth
  return auth.userId
}

export async function requireSellerSessionContext(
  request: Request,
  dependencies: Partial<SellerSessionDependencies> = {},
): Promise<SellerAuthContext | Response> {
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

  if (sessionRole !== "seller" && sessionRole !== "admin" && sessionRole !== "super_admin") {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  const tenantId = typeof session?.user?.ssoOrganization === "number" ? `org:${session.user.ssoOrganization}` : `user:${parsed}`

  return {
    userId: parsed,
    role: sessionRole,
    tenantId,
  }
}

export async function requireSellerOperation(request: Request, operation: LiveEditorOperation): Promise<SellerAuthContext | Response> {
  const context = await requireSellerSessionContext(request)
  if (context instanceof Response) return context

  const decision = await authorizeTenantOperation(
    {
      userId: String(context.userId),
      role: context.role,
      tenantId: context.tenantId,
    },
    operation,
  )

  if (!decision.allowed) {
    await recordPrivilegedOperationLog({
      request,
      context: {
        userId: String(context.userId),
        role: context.role,
        tenantId: context.tenantId,
      },
      operation,
      outcome: "denied",
      code: decision.code,
    })

    return toPolicyDeniedResponse(decision)
  }

  await recordPrivilegedOperationLog({
    request,
    context: {
      userId: String(context.userId),
      role: context.role,
      tenantId: context.tenantId,
    },
    operation,
    outcome: "allowed",
  })

  return context
}
