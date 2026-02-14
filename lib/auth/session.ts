import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface AuthenticatedSessionUser {
  userId: string
  role: string
  organizationId: number | null
  email?: string | null
  name?: string | null
}

export async function getAuthenticatedSessionUser(): Promise<AuthenticatedSessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  return {
    userId: session.user.id,
    role: session.user.role ?? "user",
    organizationId: session.user.ssoOrganization ?? null,
    email: session.user.email,
    name: session.user.name,
  }
}

export function isSessionAuthorizedForScope(
  sessionUser: AuthenticatedSessionUser,
  scope: { userId?: string | number | null; organizationId?: string | number | null },
): boolean {
  if (scope.userId !== undefined && scope.userId !== null && String(scope.userId) !== sessionUser.userId) {
    return false
  }

  if (scope.organizationId === undefined || scope.organizationId === null) {
    return true
  }

  if (!sessionUser.organizationId) {
    return false
  }

  return Number(scope.organizationId) === sessionUser.organizationId
}
