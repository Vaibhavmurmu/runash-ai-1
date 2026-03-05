import { cacheGet, cacheSet, cacheDel, cacheExpire } from "@/lib/cache/redis-client"

export interface CachedSession {
  id: string
  userId: number
  token: string
  userAgent: string
  ipAddress: string
  createdAt: Date
  expiresAt: Date
  activeOrganizationId?: string
  deviceHash?: string
  riskScore?: number
}

const SESSION_CACHE_PREFIX = "session:"
const SESSION_CACHE_TTL = 3600 // 1 hour in seconds

/**
 * Get session from cache
 */
export async function getSessionFromCache(sessionId: string): Promise<CachedSession | null> {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`
  return cacheGet<CachedSession>(cacheKey)
}

/**
 * Store session in cache
 */
export async function cacheSession(session: CachedSession): Promise<boolean> {
  const cacheKey = `${SESSION_CACHE_PREFIX}${session.id}`
  const ttl = Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000)

  return cacheSet(cacheKey, session, Math.max(60, ttl)) // minimum 60 seconds
}

/**
 * Invalidate session cache
 */
export async function invalidateSessionCache(sessionId: string): Promise<boolean> {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`
  const deleted = await cacheDel(cacheKey)
  return deleted > 0
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessionsCache(userId: number): Promise<number> {
  const pattern = `${SESSION_CACHE_PREFIX}${userId}:*`
  return cachePattern(pattern)
}

/**
 * Helper for clearing cache patterns
 */
async function cachePattern(pattern: string): Promise<number> {
  // Upstash Redis supports KEYS command for pattern matching
  // In production, consider using SCAN for large datasets
  return 0 // Placeholder - implement with actual pattern clearing logic
}

/**
 * Update session TTL in cache
 */
export async function updateSessionCacheTTL(sessionId: string, ttlSeconds: number): Promise<boolean> {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`
  return cacheExpire(cacheKey, ttlSeconds)
}

/**
 * Get user session count from cache
 */
export async function getUserSessionCountFromCache(userId: number): Promise<number> {
  const cacheKey = `user-session-count:${userId}`
  const count = await cacheGet<number>(cacheKey)
  return count || 0
}

/**
 * Update user session count in cache
 */
export async function updateUserSessionCountCache(userId: number, count: number): Promise<boolean> {
  const cacheKey = `user-session-count:${userId}`
  return cacheSet(cacheKey, count, 3600) // 1 hour
}
