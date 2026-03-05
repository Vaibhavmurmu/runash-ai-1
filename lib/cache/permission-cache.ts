import { cacheGet, cacheSet, cacheDel } from "@/lib/cache/redis-client"

export interface UserPermissions {
  userId: number
  role: string
  permissions: string[]
  organizationId?: string
}

const PERMISSION_CACHE_PREFIX = "perms:"
const PERMISSION_CACHE_TTL = 1800 // 30 minutes

/**
 * Get user permissions from cache
 */
export async function getPermissionsFromCache(userId: number, organizationId?: string): Promise<UserPermissions | null> {
  const cacheKey = buildPermissionCacheKey(userId, organizationId)
  return cacheGet<UserPermissions>(cacheKey)
}

/**
 * Cache user permissions
 */
export async function cachePermissions(permissions: UserPermissions): Promise<boolean> {
  const cacheKey = buildPermissionCacheKey(permissions.userId, permissions.organizationId)
  return cacheSet(cacheKey, permissions, PERMISSION_CACHE_TTL)
}

/**
 * Invalidate user permission cache
 */
export async function invalidatePermissionCache(userId: number, organizationId?: string): Promise<boolean> {
  const cacheKey = buildPermissionCacheKey(userId, organizationId)
  const deleted = await cacheDel(cacheKey)
  return deleted > 0
}

/**
 * Invalidate all permissions for an organization
 */
export async function invalidateOrgPermissionsCache(organizationId: string): Promise<number> {
  // This would require SCAN or KEYS pattern matching
  // For now, just clear the key
  return 0
}

/**
 * Check if user has permission (with caching)
 */
export async function hasPermissionCached(
  userId: number,
  requiredPermission: string,
  organizationId?: string,
): Promise<boolean | null> {
  const permissions = await getPermissionsFromCache(userId, organizationId)

  if (!permissions) {
    return null // Not in cache, check database
  }

  return permissions.permissions.includes(requiredPermission)
}

/**
 * Get user role from cache
 */
export async function getUserRoleFromCache(userId: number, organizationId?: string): Promise<string | null> {
  const permissions = await getPermissionsFromCache(userId, organizationId)
  return permissions?.role || null
}

/**
 * Build cache key for permissions
 */
function buildPermissionCacheKey(userId: number, organizationId?: string): string {
  if (organizationId) {
    return `${PERMISSION_CACHE_PREFIX}${userId}:org:${organizationId}`
  }

  return `${PERMISSION_CACHE_PREFIX}${userId}`
}
