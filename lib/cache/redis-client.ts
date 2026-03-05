import { Redis } from "@upstash/redis"

let redis: Redis | null = null

/**
 * Get Redis client instance (singleton pattern)
 */
export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      console.warn("[v0] Redis environment variables not configured. Caching disabled.")
      return null as any
    }

    redis = new Redis({
      url,
      token,
    })
  }

  return redis
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  try {
    const client = getRedis()
    return client !== null && client !== undefined
  } catch {
    return false
  }
}

/**
 * Cache get operation with fallback
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) {
    return null
  }

  try {
    const client = getRedis()
    const value = await client.get(key)
    return value ? (JSON.parse(value as string) as T) : null
  } catch (error) {
    console.warn(`[v0] Cache get error for key ${key}:`, error)
    return null
  }
}

/**
 * Cache set operation
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false
  }

  try {
    const client = getRedis()
    const serialized = JSON.stringify(value)

    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized)
    } else {
      await client.set(key, serialized)
    }

    return true
  } catch (error) {
    console.warn(`[v0] Cache set error for key ${key}:`, error)
    return false
  }
}

/**
 * Cache delete operation
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  if (!isRedisAvailable()) {
    return 0
  }

  try {
    const client = getRedis()
    const result = await client.del(...keys)
    return typeof result === "number" ? result : 0
  } catch (error) {
    console.warn(`[v0] Cache delete error:`, error)
    return 0
  }
}

/**
 * Cache clear pattern (get all keys matching pattern)
 */
export async function cacheClearPattern(pattern: string): Promise<number> {
  if (!isRedisAvailable()) {
    return 0
  }

  try {
    const client = getRedis()
    const keys = await client.keys(pattern)

    if (keys.length === 0) {
      return 0
    }

    const deleted = await client.del(...keys)
    return typeof deleted === "number" ? deleted : 0
  } catch (error) {
    console.warn(`[v0] Cache clear pattern error:`, error)
    return 0
  }
}

/**
 * Cache exists operation
 */
export async function cacheExists(...keys: string[]): Promise<number> {
  if (!isRedisAvailable()) {
    return 0
  }

  try {
    const client = getRedis()
    const result = await client.exists(...keys)
    return typeof result === "number" ? result : 0
  } catch (error) {
    console.warn(`[v0] Cache exists error:`, error)
    return 0
  }
}

/**
 * Cache increment (for counters)
 */
export async function cacheIncr(key: string): Promise<number> {
  if (!isRedisAvailable()) {
    return 0
  }

  try {
    const client = getRedis()
    const result = await client.incr(key)
    return typeof result === "number" ? result : 0
  } catch (error) {
    console.warn(`[v0] Cache increment error for key ${key}:`, error)
    return 0
  }
}

/**
 * Cache expire set (update TTL)
 */
export async function cacheExpire(key: string, ttlSeconds: number): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false
  }

  try {
    const client = getRedis()
    const result = await client.expire(key, ttlSeconds)
    return result === 1
  } catch (error) {
    console.warn(`[v0] Cache expire error for key ${key}:`, error)
    return false
  }
}
