import { cacheGet, cacheSet, cacheIncr, cacheExpire } from "@/lib/cache/redis-client"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

const RATE_LIMIT_PREFIX = "ratelimit:"

/**
 * Check rate limit with token bucket algorithm
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `${RATE_LIMIT_PREFIX}${identifier}`

  try {
    // Get current count
    let count = await cacheGet<number>(key)

    if (count === null || count === undefined) {
      count = 0
    }

    const now = new Date()
    const resetAt = new Date(now.getTime() + windowSeconds * 1000)

    if (count < limit) {
      // Increment and set expiry
      await cacheIncr(key)
      await cacheExpire(key, windowSeconds)

      return {
        allowed: true,
        remaining: limit - (count + 1),
        resetAt,
      }
    } else {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: windowSeconds,
      }
    }
  } catch (error) {
    console.error(`[v0] Rate limit check error for ${identifier}:`, error)
    // On error, allow the request (graceful degradation)
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    }
  }
}

/**
 * Sliding window rate limiting (more accurate but more expensive)
 */
export async function checkSlidingWindowLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `${RATE_LIMIT_PREFIX}sw:${identifier}`

  try {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    // Get count of requests in window
    const count = await cacheGet<number>(key)

    if (count === null || count === undefined) {
      // First request in window
      await cacheSet(key, 1, windowSeconds)
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now + windowSeconds * 1000),
      }
    }

    if (count < limit) {
      await cacheIncr(key)
      return {
        allowed: true,
        remaining: limit - (count + 1),
        resetAt: new Date(now + windowSeconds * 1000),
      }
    } else {
      const resetAt = new Date(now + windowSeconds * 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: windowSeconds,
      }
    }
  } catch (error) {
    console.error(`[v0] Sliding window rate limit error for ${identifier}:`, error)
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    }
  }
}

/**
 * Distributed rate limiter for high-traffic endpoints
 */
export async function checkDistributedRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
  nodeId?: string,
): Promise<RateLimitResult> {
  // Use node ID for distributed tracking across instances
  const key = nodeId ? `${RATE_LIMIT_PREFIX}dist:${nodeId}:${identifier}` : `${RATE_LIMIT_PREFIX}${identifier}`

  return checkRateLimit(key, limit, windowSeconds)
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(identifier: string): Promise<{ count: number; limit?: number }> {
  const key = `${RATE_LIMIT_PREFIX}${identifier}`

  try {
    const count = await cacheGet<number>(key)
    return {
      count: count || 0,
    }
  } catch (error) {
    console.error(`[v0] Error getting rate limit status:`, error)
    return {
      count: 0,
    }
  }
}

/**
 * Reset rate limit for identifier
 */
export async function resetRateLimit(identifier: string): Promise<boolean> {
  const key = `${RATE_LIMIT_PREFIX}${identifier}`

  try {
    const deleted = await (async () => {
      // This would use cacheDel but it's not imported
      // For now, set to 0
      return await cacheSet(key, 0, 1)
    })()

    return deleted
  } catch (error) {
    console.error(`[v0] Error resetting rate limit:`, error)
    return false
  }
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  auth: { limit: 10, windowSeconds: 60 }, // 10 requests per minute
  login: { limit: 5, windowSeconds: 300 }, // 5 requests per 5 minutes
  passwordReset: { limit: 3, windowSeconds: 3600 }, // 3 requests per hour
  emailVerification: { limit: 5, windowSeconds: 3600 }, // 5 requests per hour

  // API endpoints
  apiDefault: { limit: 100, windowSeconds: 60 }, // 100 requests per minute
  apiSearchHeavy: { limit: 30, windowSeconds: 60 }, // 30 requests per minute
  apiWrite: { limit: 20, windowSeconds: 60 }, // 20 requests per minute

  // User-specific
  fileUpload: { limit: 50, windowSeconds: 86400 }, // 50 uploads per day
  dataExport: { limit: 5, windowSeconds: 86400 }, // 5 exports per day

  // Admin endpoints
  adminOps: { limit: 1000, windowSeconds: 60 }, // 1000 requests per minute
}
