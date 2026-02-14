import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { RBACManager, type OperatorScope } from "@/lib/rbac"
import { getAuthenticatedSessionUser, isSessionAuthorizedForScope, type AuthenticatedSessionUser } from "@/lib/auth/session"

export interface RouteGuardSuccess {
  sessionUser: AuthenticatedSessionUser
}

export interface RouteGuardFailure {
  response: NextResponse
}

export type RouteGuardResult = RouteGuardSuccess | RouteGuardFailure

export async function requireBillingSession(): Promise<
  { sessionUser: AuthenticatedSessionUser; unauthorizedResponse: null } | { sessionUser: null; unauthorizedResponse: NextResponse }
> {
  const sessionUser = await getAuthenticatedSessionUser()
  if (!sessionUser) {
    return { sessionUser: null, unauthorizedResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  return { sessionUser, unauthorizedResponse: null }
}

export function requireScopedRole(sessionUser: AuthenticatedSessionUser, scope: OperatorScope): NextResponse | null {
  if (RBACManager.hasScopedOperatorAccess(sessionUser.role, scope)) {
    return null
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function requireScopedBillingAccess(scope: OperatorScope): Promise<RouteGuardResult> {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return { response: auth.unauthorizedResponse }
  }

  const roleResponse = requireScopedRole(auth.sessionUser, scope)
  if (roleResponse) {
    return { response: roleResponse }
  }

  return { sessionUser: auth.sessionUser }
}

export async function requireRoleBillingAccess(roles: string[]): Promise<RouteGuardResult> {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return { response: auth.unauthorizedResponse }
  }

  if (!roles.includes(auth.sessionUser.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { sessionUser: auth.sessionUser }
}

export async function getAuthorizedBillingIdentity(sessionUser: AuthenticatedSessionUser) {
  const users = await Database.query<{ id: string; stripe_customer_id: string | null; sso_organization_id: number | null }>(
    `SELECT id, stripe_customer_id, sso_organization_id FROM users WHERE id = $1 LIMIT 1`,
    [sessionUser.userId],
  )

  const user = users[0]
  if (!user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!isSessionAuthorizedForScope(sessionUser, { userId: user.id, organizationId: user.sso_organization_id })) {
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { user }
}
