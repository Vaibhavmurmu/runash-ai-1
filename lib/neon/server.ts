import "server-only"
import { createServerClient } from "@/lib/neon/ssr"
import { cookies } from "next/headers"
import type { Database } from "./types"
import { getServerAuthSession } from "@/lib/auth/session"

export function createServerNeonClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(process.env.NEXT_PUBLIC_NEON_URL!, process.env.NEON_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export const createClient = createServerNeonClient

export async function getUser() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email ?? undefined,
    user_metadata: {
      name: session.user.name,
      role: session.user.role,
      ssoOrganization: session.user.ssoOrganization,
    },
  }
}

export async function getSession() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return null
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      user_metadata: {
        name: session.user.name,
        role: session.user.role,
        ssoOrganization: session.user.ssoOrganization,
      },
    },
  }
}
