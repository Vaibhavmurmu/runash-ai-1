import { NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { DEFAULT_ROLES, RBACManager, type BillingAction, type OperatorScope } from "@/lib/rbac"
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



function isCustomerRole(role: string): boolean {
  return role === DEFAULT_ROLES.CUSTOMER_ADMIN || role === DEFAULT_ROLES.CUSTOMER_OPERATOR || role === DEFAULT_ROLES.CUSTOMER_FINANCE
}

function requireCustomerOrganizationScope(sessionUser: AuthenticatedSessionUser): NextResponse | null {
  if (isCustomerRole(sessionUser.role) && !sessionUser.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export function requireScopedRole(sessionUser: AuthenticatedSessionUser, scope: OperatorScope): NextResponse | null {
  if (RBACManager.hasScopedOperatorAccess(sessionUser.role, scope)) {
    const customerOrgScopeError = requireCustomerOrganizationScope(sessionUser)
    if (customerOrgScopeError) return customerOrgScopeError
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

  const customerOrgScopeError = requireCustomerOrganizationScope(auth.sessionUser)
  if (customerOrgScopeError) {
    return { response: customerOrgScopeError }
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

  const customerOrgScopeError = requireCustomerOrganizationScope(auth.sessionUser)
  if (customerOrgScopeError) {
    return { response: customerOrgScopeError }
  }

  return { sessionUser: auth.sessionUser }
}


export function requireBillingActionRole(sessionUser: AuthenticatedSessionUser, action: BillingAction): NextResponse | null {
  if (!RBACManager.hasBillingActionAccess(sessionUser.role, action)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return requireCustomerOrganizationScope(sessionUser)
}

export async function requireBillingActionAccess(action: BillingAction): Promise<RouteGuardResult> {
  const auth = await requireBillingSession()
  if (auth.unauthorizedResponse || !auth.sessionUser) {
    return { response: auth.unauthorizedResponse }
  }

  const actionRoleResponse = requireBillingActionRole(auth.sessionUser, action)
  if (actionRoleResponse) {
    return { response: actionRoleResponse }
  }

  return { sessionUser: auth.sessionUser }
}

export function ensureCustomerScopedAccess(
  sessionUser: AuthenticatedSessionUser,
  scope: { ownerUserId?: string | number | null; customerId?: string | number | null; organizationId?: string | number | null },
): NextResponse | null {
  if (!isSessionAuthorizedForScope(sessionUser, { userId: scope.ownerUserId ?? scope.customerId, organizationId: scope.organizationId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
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
