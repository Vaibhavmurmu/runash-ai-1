import { headers } from "next/headers"
import { neon } from "@neondatabase/serverless"
import { auth } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

export interface ServerAuthSession {
  user: {
    id: string
    role: string
    ssoOrganization: number | null
    email?: string | null
    name?: string | null
  }
}

export interface AuthenticatedSessionUser {
  userId: string
  role: string
  organizationId: number | null
  email?: string | null
  name?: string | null
}

export async function getServerAuthSession(requestHeaders?: Headers): Promise<ServerAuthSession | null> {
  const resolvedHeaders = requestHeaders ?? (await headers())
  const session = await auth.api.getSession({ headers: resolvedHeaders })

  if (!session?.user) {
    return null
  }

  const [dbUser] =
    session.user.email
      ? await sql`
          SELECT id::text AS id, role, sso_organization_id
          FROM users
          WHERE email = ${session.user.email}
          LIMIT 1
        `
      : []

  return {
    user: {
      id: dbUser?.id ?? String(session.user.id),
      role: dbUser?.role ?? "user",
      ssoOrganization: dbUser?.sso_organization_id ?? null,
      email: session.user.email,
      name: session.user.name,
    },
  }
}

export async function getAuthenticatedSessionUser(): Promise<AuthenticatedSessionUser | null> {
  const session = await getServerAuthSession()
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
