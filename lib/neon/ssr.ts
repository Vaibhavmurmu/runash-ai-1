import { auth } from "@/lib/auth"
import type { Database } from "./types"
import { PostgrestClient } from "@supabase/postgrest-js"

type UnsupportedAuthResult<T> = Promise<{ data: T; error: null }>

type SessionUser = {
  id: string
  email?: string
  name?: string
}

type SessionShape = {
  user: SessionUser
  access_token: string
}

type CookieStore = {
  getAll?: () => Array<{ name: string; value: string }>
}

function mapBetterAuthSession(session: Awaited<ReturnType<typeof auth.api.getSession>>): SessionShape | null {
  if (!session?.user || !session?.session?.token) {
    return null
  }

  return {
    user: {
      id: String(session.user.id),
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    },
    access_token: session.session.token,
  }
}

function cookieHeaderFromStore(cookieStore?: CookieStore): string {
  if (!cookieStore?.getAll) {
    return ""
  }

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
}

function createBetterAuthBridge(getSession: () => Promise<SessionShape | null>) {
  return {
    async getSession(): UnsupportedAuthResult<{ session: SessionShape | null }> {
      return { data: { session: await getSession() }, error: null }
    },
    async getUser(): UnsupportedAuthResult<{ user: SessionUser | null }> {
      const session = await getSession()
      return { data: { user: session?.user ?? null }, error: null }
    },
    onAuthStateChange() {
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }
    },
  }
}

function createPgClient<T = Database>(url: string, key: string) {
  const client = new PostgrestClient<T>(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })
  return client
}

export function createBrowserClient<T = Database>(_url: string, _anonKey: string) {
  const authBridge = createBetterAuthBridge(async () => {
    if (typeof window === "undefined") {
      return null
    }

    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return mapBetterAuthSession(await response.json())
  })

  const client = createPgClient<T>(_url, _anonKey)

  return Object.assign(client, { auth: authBridge }) as unknown as PostgrestClient<T> & { auth: typeof authBridge }
}

export function createServerClient<T = Database>(
  _url: string,
  _serviceRoleKey: string,
  options?: { cookies?: { getAll: () => unknown[]; setAll?: (cookiesToSet: unknown[]) => void } },
) {
  const authBridge = createBetterAuthBridge(async () => {
    const cookieHeader = cookieHeaderFromStore(options?.cookies as CookieStore)
    if (!cookieHeader) {
      return null
    }

    const headers = new Headers()
    headers.set("cookie", cookieHeader)
    return mapBetterAuthSession(await auth.api.getSession({ headers }))
  })

  const client = createPgClient<T>(_url, _serviceRoleKey)
  return Object.assign(client, { auth: authBridge }) as unknown as PostgrestClient<T> & { auth: typeof authBridge }
}
