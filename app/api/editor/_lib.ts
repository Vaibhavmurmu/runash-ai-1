import { NextResponse } from "next/server"

import { authorizeTenantOperation, recordPrivilegedOperationLog, toPolicyDeniedResponse } from "@/lib/authz/live-policy"
import { getServerAuthSession } from "@/lib/auth/session"
import type { LiveEditorOperation } from "@/types/auth"

export type EditorAuthContext = {
  userId: string
  role: string
  tenantId: string
}

function toTenantId(userId: string, ssoOrganization?: number) {
  if (typeof ssoOrganization === "number" && Number.isFinite(ssoOrganization)) {
    return `org:${ssoOrganization}`
  }

  return `user:${userId}`
}

export async function requireEditorUser(request?: Request): Promise<{ error: NextResponse } | EditorAuthContext> {
  const session = await getServerAuthSession(request?.headers)
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }) }
  }

  const role = session.user.role?.toString().trim().toLowerCase() || "user"
  return {
    userId: session.user.id,
    role,
    tenantId: toTenantId(session.user.id, session.user.ssoOrganization),
  }
}

export async function requireEditorOperation(request: Request, operation: LiveEditorOperation) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth

  const decision = await authorizeTenantOperation(
    {
      userId: auth.userId,
      role: auth.role,
      tenantId: auth.tenantId,
    },
    operation,
  )

  if (!decision.allowed) {
    await recordPrivilegedOperationLog({
      request,
      context: {
        userId: auth.userId,
        role: auth.role,
        tenantId: auth.tenantId,
      },
      operation,
      outcome: "denied",
      code: decision.code,
    })

    return {
      error: toPolicyDeniedResponse(decision),
    }
  }

  await recordPrivilegedOperationLog({
    request,
    context: {
      userId: auth.userId,
      role: auth.role,
      tenantId: auth.tenantId,
    },
    operation,
    outcome: "allowed",
  })

  return auth
}
