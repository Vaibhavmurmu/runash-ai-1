/**
 * Examples of how to integrate caching into your application
 * These are code patterns to follow in your route handlers and service functions
 */

import {
  withCaching,
  getCachedAuthContext,
  cacheAuthContext,
  invalidateUserCache,
  getBatchCached,
} from "@/lib/cache/cache-integration"
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/cache/rate-limit-cache"
import { getPermissionsFromCache, cachePermissions } from "@/lib/cache/permission-cache"

/**
 * EXAMPLE 1: Using caching in a GET endpoint
 * This pattern is useful for frequently accessed data like user profiles
 */
export async function exampleGetUserProfile(userId: number) {
  return withCaching(`user:${userId}:profile`, async () => {
    // Simulate database query
    // const user = await db.query('SELECT * FROM users WHERE id = $1', [userId])
    // return user.rows[0]

    return {
      id: userId,
      name: "John Doe",
      email: "john@example.com",
    }
  })
}

/**
 * EXAMPLE 2: Using caching with rate limiting
 * This pattern protects endpoints from abuse
 */
export async function exampleProtectedEndpoint(userId: number, ipAddress: string) {
  // Check rate limit first
  const rateLimitKey = `api:user:${userId}`
  const limitResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.apiDefault.limit, RATE_LIMIT_CONFIGS.apiDefault.windowSeconds)

  if (!limitResult.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${limitResult.retryAfter} seconds`)
  }

  // Then get cached data
  return withCaching(`endpoint:${userId}`, async () => {
    // Your endpoint logic here
    return { data: "protected data" }
  })
}

/**
 * EXAMPLE 3: Using permissions from cache
 * This pattern is useful for authorization checks
 */
export async function exampleCheckPermission(userId: number, requiredPermission: string, organizationId?: string) {
  // Try to get permissions from cache
  let permissions = await getPermissionsFromCache(userId, organizationId)

  if (!permissions) {
    // Not in cache, would fetch from database
    // const userPerms = await db.query('SELECT * FROM user_permissions WHERE user_id = $1', [userId])
    // permissions = userPerms.rows[0]
    // await cachePermissions(permissions)

    permissions = {
      userId,
      role: "admin",
      permissions: ["read", "write", "delete"],
      organizationId,
    }

    await cachePermissions(permissions)
  }

  return permissions.permissions.includes(requiredPermission)
}

/**
 * EXAMPLE 4: Batch caching for multiple items
 * This pattern is useful when you need to fetch multiple items at once
 */
export async function exampleGetMultipleUsers(userIds: number[]) {
  return getBatchCached(
    userIds.map((id) => `user:${id}`),
    async (missingKeys) => {
      // Only fetch missing users from database
      // const users = await db.query('SELECT * FROM users WHERE id = ANY($1)', [missingIds])
      // return users.rows.reduce((acc, user) => ({
      //   ...acc,
      //   [`user:${user.id}`]: user
      // }), {})

      return {
        "user:1": { id: 1, name: "John" },
        "user:2": { id: 2, name: "Jane" },
      }
    },
  )
}

/**
 * EXAMPLE 5: Full authentication context caching
 * This pattern is useful for session validation
 */
export async function exampleValidateSession(sessionId: string) {
  // Try to get from cache first
  const cached = await getCachedAuthContext(sessionId)
  if (cached) {
    console.log("[v0] Using cached auth context")
    return cached
  }

  // Not in cache, would fetch from database
  // const session = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId])
  // const user = await db.query('SELECT * FROM users WHERE id = $1', [session.user_id])
  // const permissions = await getPermissionsFromCache(user.id)

  const authContext = {
    session: { id: sessionId, userId: 1 },
    user: { id: 1, email: "user@example.com" },
    permissions: { role: "user", permissions: ["read"] },
  }

  // Cache the full context
  await cacheAuthContext(sessionId, authContext.session, authContext.user, authContext.permissions)

  return authContext
}

/**
 * EXAMPLE 6: Invalidating cache on updates
 * This pattern ensures data stays fresh after modifications
 */
export async function exampleUpdateUserProfile(userId: number, updates: any) {
  try {
    // Update in database
    // await db.query('UPDATE users SET ... WHERE id = $1', [userId, ...])

    // Invalidate cache
    await invalidateUserCache(userId)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating user profile:", error)
    return { success: false, error: error }
  }
}

/**
 * EXAMPLE 7: Using cache for complex queries
 * This pattern is useful for expensive database operations
 */
export async function exampleGetUserAnalytics(userId: number, period: "day" | "week" | "month") {
  const cacheKey = `analytics:${userId}:${period}`

  return withCaching(
    cacheKey,
    async () => {
      // This would be a complex query
      // const result = await db.query(`
      //   SELECT
      //     DATE_TRUNC('day', created_at) as date,
      //     COUNT(*) as count
      //   FROM audit_events
      //   WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${period}'
      //   GROUP BY date
      // `, [userId])

      return {
        period,
        data: [
          { date: "2024-01-01", count: 42 },
          { date: "2024-01-02", count: 35 },
        ],
      }
    },
    // Different TTL for different periods
    period === "month" ? 86400 : period === "week" ? 3600 : 300,
  )
}

/**
 * EXAMPLE 8: Cache warming on startup
 * This pattern pre-loads commonly used data
 */
export async function exampleWarmUpApplicationCache() {
  console.log("[v0] Warming up application cache...")

  // Cache common configuration
  // const config = await db.query('SELECT * FROM app_config')
  // for (const item of config.rows) {
  //   await cacheSet(`config:${item.key}`, item.value, 86400)
  // }

  // Cache frequently accessed roles and permissions
  // const roles = await db.query('SELECT * FROM roles')
  // for (const role of roles.rows) {
  //   await cacheSet(`role:${role.id}`, role, 86400)
  // }

  console.log("[v0] Cache warm-up complete")
}

/**
 * EXAMPLE 9: Login attempt caching with rate limiting
 * This pattern protects against brute force attacks
 */
export async function exampleCheckLoginAttempts(email: string, ipAddress: string) {
  const emailLimitKey = `login-attempt:email:${email}`
  const ipLimitKey = `login-attempt:ip:${ipAddress}`

  // Check both email and IP limits
  const emailLimit = await checkRateLimit(emailLimitKey, RATE_LIMIT_CONFIGS.login.limit, RATE_LIMIT_CONFIGS.login.windowSeconds)

  const ipLimit = await checkRateLimit(ipLimitKey, RATE_LIMIT_CONFIGS.login.limit * 10, // Higher limit for IP
    RATE_LIMIT_CONFIGS.login.windowSeconds)

  if (!emailLimit.allowed || !ipLimit.allowed) {
    throw new Error("Too many login attempts. Please try again later.")
  }

  return { allowed: true }
}

/**
 * EXAMPLE 10: Session cleanup and cache optimization
 * This pattern maintains cache health
 */
export async function exampleCleanupExpiredCache() {
  // In production, you would:
  // 1. Remove expired cache entries
  // 2. Clear stale data
  // 3. Update TTLs for active sessions
  // 4. Monitor cache hit rates

  console.log("[v0] Starting cache cleanup...")

  // Example: Remove cache entries older than their TTL
  // This is handled automatically by Redis with proper TTL settings

  console.log("[v0] Cache cleanup complete")
}

/**
 * EXAMPLE 11: Conditional caching based on user type
 * This pattern optimizes cache usage for different user types
 */
export async function exampleGetUserDashboard(userId: number, userType: "free" | "premium" | "enterprise") {
  // Different cache durations for different user types
  const ttlMap = {
    free: 300, // 5 minutes
    premium: 3600, // 1 hour
    enterprise: 86400, // 1 day
  }

  return withCaching(`dashboard:${userId}`, async () => {
    // Fetch dashboard data
    return {
      userId,
      userType,
      data: { /* dashboard data */ },
    }
  }, ttlMap[userType])
}

/**
 * EXAMPLE 12: Error handling with cache fallback
 * This pattern provides resilience when database is slow
 */
export async function exampleGetDataWithFallback(key: string) {
  try {
    // Try to get fresh data from database
    // const data = await db.query(...)
    const freshData = { timestamp: new Date(), value: "fresh" }

    // Cache it
    await withCaching(key, async () => freshData)

    return freshData
  } catch (error) {
    console.warn(`[v0] Database error, falling back to cache: ${error}`)

    // Fall back to cached version if available
    // Note: In real implementation, you'd check cache first
    return { timestamp: new Date(), value: "cached" }
  }
}
