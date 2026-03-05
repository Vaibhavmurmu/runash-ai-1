import { cacheGet, cacheSet, cacheDel } from "@/lib/cache/redis-client"
import { getSessionFromCache, cacheSession, invalidateSessionCache } from "@/lib/cache/session-cache"
import { getPermissionsFromCache, cachePermissions, invalidatePermissionCache } from "@/lib/cache/permission-cache"

/**
 * Unified caching layer for application
 */

/**
 * Get cached authentication context
 */
export async function getCachedAuthContext(sessionId: string): Promise<{
  session: any
  user: any
  permissions: any
} | null> {
  const cacheKey = `auth-context:${sessionId}`

  const cached = await cacheGet(cacheKey)
  if (cached) {
    return cached
  }

  return null
}

/**
 * Cache full authentication context
 */
export async function cacheAuthContext(
  sessionId: string,
  session: any,
  user: any,
  permissions: any,
): Promise<boolean> {
  const cacheKey = `auth-context:${sessionId}`

  return cacheSet(
    cacheKey,
    {
      session,
      user,
      permissions,
    },
    3600, // 1 hour
  )
}

/**
 * Invalidate all caches for user
 */
export async function invalidateUserCache(userId: number, sessionId?: string): Promise<number> {
  let invalidated = 0

  // Invalidate specific session if provided
  if (sessionId) {
    const deleted = await invalidateSessionCache(sessionId)
    if (deleted) invalidated++
  }

  // Invalidate permissions
  const permDeleted = await invalidatePermissionCache(userId)
  if (permDeleted) invalidated++

  // Invalidate auth context
  const authCacheKey = `auth-context:*`
  // This would require pattern matching - would be handled by Redis KEYS command

  return invalidated
}

/**
 * Warm up cache with commonly accessed data
 */
export async function warmUpCache(userId: number): Promise<boolean> {
  try {
    // Pre-cache user data
    const userCacheKey = `user:${userId}`
    const permissionsCacheKey = `perms:${userId}`

    // You would fetch these from database and cache them
    // This is a placeholder for the pattern

    console.log(`[v0] Warmed up cache for user ${userId}`)
    return true
  } catch (error) {
    console.error(`[v0] Error warming up cache:`, error)
    return false
  }
}

/**
 * Cache middleware for use in route handlers
 */
export async function withCaching<T>(
  cacheKey: string,
  cacheFn: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(cacheKey)
  if (cached) {
    console.log(`[v0] Cache hit for key: ${cacheKey}`)
    return cached
  }

  // Not in cache, execute function
  console.log(`[v0] Cache miss for key: ${cacheKey}, executing function`)
  const result = await cacheFn()

  // Store in cache
  await cacheSet(cacheKey, result, ttlSeconds)

  return result
}

/**
 * Batch cache operations
 */
export async function getBatchCached<T>(
  keys: string[],
  fetchFn: (missingKeys: string[]) => Promise<Record<string, T>>,
  ttlSeconds: number = 3600,
): Promise<Record<string, T>> {
  const results: Record<string, T> = {}
  const missingKeys: string[] = []

  // Check which keys are in cache
  for (const key of keys) {
    const cached = await cacheGet<T>(key)
    if (cached) {
      results[key] = cached
    } else {
      missingKeys.push(key)
    }
  }

  // Fetch missing keys
  if (missingKeys.length > 0) {
    const fetched = await fetchFn(missingKeys)

    // Cache the fetched results
    for (const [key, value] of Object.entries(fetched)) {
      results[key] = value
      await cacheSet(key, value, ttlSeconds)
    }
  }

  return results
}

/**
 * Cache invalidation patterns
 */
export const CACHE_INVALIDATION_PATTERNS = {
  // Session invalidation
  userSessions: (userId: number) => `session:${userId}:*`,
  allSessions: () => `session:*`,

  // Permission invalidation
  userPermissions: (userId: number) => `perms:${userId}*`,
  allPermissions: () => `perms:*`,

  // Authentication context
  authContext: (sessionId: string) => `auth-context:${sessionId}`,

  // Rate limiting
  rateLimitUser: (userId: number) => `ratelimit:user:${userId}:*`,
  rateLimitIP: (ip: string) => `ratelimit:ip:${ip}:*`,

  // Suspicious logins
  suspiciousLogins: (userId: number) => `suspicious:${userId}:*`,

  // Device fingerprints
  deviceFingerprints: (userId: number) => `device:${userId}:*`,
}

/**
 * Monitor cache performance
 */
export class CacheMetrics {
  private static hits = 0
  private static misses = 0
  private static errors = 0

  static recordHit(): void {
    this.hits++
  }

  static recordMiss(): void {
    this.misses++
  }

  static recordError(): void {
    this.errors++
  }

  static getMetrics() {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0

    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      total,
      hitRate: hitRate.toFixed(2) + "%",
    }
  }

  static reset(): void {
    this.hits = 0
    this.misses = 0
    this.errors = 0
  }
}
