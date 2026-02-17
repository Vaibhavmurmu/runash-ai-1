import type { Database } from "./types"

type UnsupportedAuthResult<T> = Promise<{ data: T; error: null }>

function unsupportedAuthClient() {
  return {
    async getSession(): UnsupportedAuthResult<{ session: null }> {
      return { data: { session: null }, error: null }
    },
    async getUser(): UnsupportedAuthResult<{ user: null }> {
      return { data: { user: null }, error: null }
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

export function createBrowserClient<T = Database>(_url: string, _anonKey: string) {
  return {
    auth: unsupportedAuthClient(),
  } as T & { auth: ReturnType<typeof unsupportedAuthClient> }
}

export function createServerClient<T = Database>(
  _url: string,
  _serviceRoleKey: string,
  _options?: { cookies?: { getAll: () => unknown[]; setAll?: (cookiesToSet: unknown[]) => void } },
) {
  return {
    auth: unsupportedAuthClient(),
  } as T & { auth: ReturnType<typeof unsupportedAuthClient> }
}
