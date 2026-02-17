import { cookies } from "next/headers"
import { getAuthSessionFromHeaders } from "./auth/session-accessor"
import { isFeatureFlagEnabled } from "./feature-flags"
import { getServerAuthSession } from "@/lib/auth/session"

type GetSessionDependencies = {
  readSessionFromHeaders: typeof getAuthSessionFromHeaders
  getCookieHeader: () => Promise<string>
}

async function getDefaultCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
}

/**
 * Get current session from request cookies.
 * Works in Server Components and API Routes.
 */
export async function getSession(dependencies: Partial<GetSessionDependencies> = {}) {
  const getCookieHeader = dependencies.getCookieHeader ?? getDefaultCookieHeader
  const readSessionFromHeaders = dependencies.readSessionFromHeaders ?? getAuthSessionFromHeaders

  const cookieHeader = await getCookieHeader()

  if (!cookieHeader) {
    return null
  }

  const requestHeaders = new Headers()
  requestHeaders.set("cookie", cookieHeader)

  return readSessionFromHeaders(requestHeaders)
}

/**
 * Determine which auth system to use (Better Auth or NextAuth during migration)
 */
export async function shouldUseBetterAuth(userId?: string): Promise<boolean> {
  return isFeatureFlagEnabled("use_better_auth", { userId })
}

export async function getCurrentUser() {
  const session = await getServerAuthSession()
  return session?.user || null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized: User not authenticated")
  }
  return user
}

export async function getClientIP(): Promise<string> {
  const headersList = await (await import("next/headers")).headers()
  return headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "unknown"
}
