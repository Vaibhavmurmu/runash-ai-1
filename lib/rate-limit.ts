import type { NextRequest } from "next/server"

type RequestLike = Pick<Request, "headers"> & { ip?: string | null }

interface RateLimitResult {
  success: boolean
  remaining?: number
  resetTime?: number
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export async function rateLimit(
  request: NextRequest | RequestLike,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
  const key = `${identifier}:${ip}`

  const now = Date.now()
  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }

  const current = rateLimitStore.get(key)

  if (!current || current.resetTime < now) {
    // First request in window or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    }
  }

  if (current.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    }
  }

  // Increment count
  current.count++
  rateLimitStore.set(key, current)

  return {
    success: true,
    remaining: limit - current.count,
    resetTime: current.resetTime,
  }
}
