import {
  getServerAuthSession as getServerSessionFromAuthModule,
  getAuthenticatedSessionUser as getAuthenticatedSessionUserFromAuthModule,
  isSessionAuthorizedForScope as isSessionAuthorizedForScopeFromAuthModule,
  type AuthenticatedSessionUser,
  type ServerAuthSession,
} from "@/lib/auth"

export type { AuthenticatedSessionUser, ServerAuthSession }

export async function getServerAuthSession(requestHeaders?: Headers): Promise<ServerAuthSession | null> {
  return getServerSessionFromAuthModule(requestHeaders)
}

export async function getAuthenticatedSessionUser(): Promise<AuthenticatedSessionUser | null> {
  return getAuthenticatedSessionUserFromAuthModule()
}

export function isSessionAuthorizedForScope(
  sessionUser: AuthenticatedSessionUser,
  scope: { userId?: string | number | null; organizationId?: string | number | null },
): boolean {
  return isSessionAuthorizedForScopeFromAuthModule(sessionUser, scope)
}
