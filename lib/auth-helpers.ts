import { cookies, headers } from "next/headers"
import { auth } from "./auth"
import { isFeatureFlagEnabled } from "./feature-flags"

type SessionReader = typeof auth.api.getSession

type GetSessionDependencies = {
  readSession: SessionReader
  getCookieHeader: () => Promise<string>
  getRequestHeaders: () => Promise<Headers>
}

async function getDefaultCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")

  return cookieHeader
}

/**
 * Get current session from cookies
 * Works in Server Components and API Routes
 */
export async function getSession(dependencies: Partial<GetSessionDependencies> = {}) {
  const getCookieHeader = dependencies.getCookieHeader ?? getDefaultCookieHeader
  const readSession = dependencies.readSession ?? auth.api.getSession
  const getRequestHeaders = dependencies.getRequestHeaders ?? (async () => new Headers(await headers()))
  const cookieHeader = await getCookieHeader()

  if (!cookieHeader) {
    return null
  }

  try {
    const requestHeaders = await getRequestHeaders()
    requestHeaders.set("cookie", cookieHeader)

    // Verify token with Better Auth
    const session = await readSession({
      headers: requestHeaders,
    })

    return session
  } catch (error) {
    console.error("[v0] Error getting session:", error)
    return null
  }
}

/**
 * Determine which auth system to use (Better Auth or NextAuth during migration)
 */
export async function shouldUseBetterAuth(userId?: string): Promise<boolean> {
  const useBetterAuth = await isFeatureFlagEnabled("use_better_auth", { userId })
  return useBetterAuth
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

/**
 * Verify if user is authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized: User not authenticated")
  }
  return user
}

/**
 * Get client IP for security tracking
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers()
  return headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "unknown"
}
