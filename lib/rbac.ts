import { neon } from "@neondatabase/serverless"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const sql = neon(process.env.DATABASE_URL!)

// Default roles and permissions
export const DEFAULT_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
  GUEST: "guest",
  BUSINESS_ADMIN: "business_admin",
  BUSINESS_OPERATOR: "business_operator",
  STARTUP_ADMIN: "startup_admin",
  STARTUP_OPERATOR: "startup_operator",
  CUSTOMER_ADMIN: "customer_admin",
  CUSTOMER_OPERATOR: "customer_operator",
  CUSTOMER_FINANCE: "customer_finance",
} as const

export const BASELINE_ROLES = {
  VIEWER: "viewer",
  OPERATOR: "operator",
  ADMIN: "admin",
} as const

export const CANONICAL_ADMIN_ROLES = {
  VIEWER: BASELINE_ROLES.VIEWER,
  OPERATOR: BASELINE_ROLES.OPERATOR,
  ADMIN: BASELINE_ROLES.ADMIN,
} as const

export type BaselineRole = (typeof BASELINE_ROLES)[keyof typeof BASELINE_ROLES]
export type ProtectedRouteScope = "api" | "ui"

export type OperatorScope = "business" | "startup"
export type BillingAction = "finance:read" | "billing:admin" | "billing:operate"

export const DEFAULT_PERMISSIONS = {
  // User management
  "users:read": "View users",
  "users:write": "Create and edit users",
  "users:delete": "Delete users",
  "users:ban": "Ban/unban users",

  // Content management
  "content:read": "View content",
  "content:write": "Create and edit content",
  "content:delete": "Delete content",
  "content:moderate": "Moderate content",

  // Admin panel
  "admin:access": "Access admin panel",
  "admin:analytics": "View analytics",
  "admin:settings": "Manage system settings",
  "dashboard:read": "Read-only dashboard access",
  "operations:restart": "Restart operational services",
  "operations:cache:clear": "Clear operational caches",
  "system:control": "Perform system-level control operations",

  // Streaming
  "streams:create": "Create streams",
  "streams:moderate": "Moderate streams",
  "streams:analytics": "View stream analytics",

  // Payments
  "payments:read": "View payment information",
  "payments:write": "Process payments",
  "payments:refund": "Issue refunds",

  // System
  "system:maintenance": "Perform system maintenance",
  "system:logs": "View system logs",
} as const

const VIEWER_PERMISSION_BUNDLE = ["admin:access", "dashboard:read"] as const
const OPERATOR_PERMISSION_BUNDLE = [
  ...VIEWER_PERMISSION_BUNDLE,
  "operations:restart",
  "operations:cache:clear",
  "system:maintenance",
] as const
const ADMIN_PERMISSION_BUNDLE = [
  ...OPERATOR_PERMISSION_BUNDLE,
  "admin:analytics",
  "admin:settings",
  "users:read",
  "users:write",
  "users:delete",
  "users:ban",
  "content:read",
  "content:write",
  "content:delete",
  "content:moderate",
  "streams:create",
  "streams:moderate",
  "streams:analytics",
  "payments:read",
  "payments:write",
  "payments:refund",
  "system:logs",
  "system:control",
] as const

type RoutePermissionRule = {
  prefix: string
  methods?: readonly string[]
  requiredPermissions: readonly string[]
}

const ADMIN_API_ROUTE_RULES: readonly RoutePermissionRule[] = [
  // Settings-write and full CRUD admin resources
  { prefix: "/api/admin/settings", requiredPermissions: ["admin:settings"] },
  { prefix: "/api/admin/sso", requiredPermissions: ["admin:settings"] },
  { prefix: "/api/admin/permissions", requiredPermissions: ["admin:settings"], methods: ["GET", "POST", "PATCH"] },
  { prefix: "/api/admin/permissions", requiredPermissions: ["admin:settings", "system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/roles", requiredPermissions: ["admin:settings"], methods: ["GET", "POST", "PATCH"] },
  { prefix: "/api/admin/roles", requiredPermissions: ["admin:settings", "system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/audit-logs", requiredPermissions: ["system:logs"], methods: ["GET"] },
  { prefix: "/api/admin/audit-logs", requiredPermissions: ["admin:settings"], methods: ["POST", "PATCH"] },
  { prefix: "/api/admin/audit-logs", requiredPermissions: ["admin:settings", "system:control"], methods: ["DELETE"] },

  // Read/operate scoped endpoints
  { prefix: "/api/admin/email-templates", requiredPermissions: ["admin:analytics"], methods: ["GET"] },
  { prefix: "/api/admin/email-templates", requiredPermissions: ["admin:settings"], methods: ["POST", "PUT", "PATCH"] },
  { prefix: "/api/admin/email-templates", requiredPermissions: ["admin:settings", "system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/email-suppressions", requiredPermissions: ["admin:analytics"], methods: ["GET"] },
  { prefix: "/api/admin/email-suppressions", requiredPermissions: ["admin:settings"], methods: ["POST", "PUT", "PATCH"] },
  { prefix: "/api/admin/email-suppressions", requiredPermissions: ["admin:settings", "system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/email-management", requiredPermissions: ["admin:settings"] },
  { prefix: "/api/admin/email-delivery", requiredPermissions: ["admin:analytics"] },
  { prefix: "/api/admin/email-analytics", requiredPermissions: ["admin:analytics"] },
  { prefix: "/api/admin/security", requiredPermissions: ["admin:analytics"], methods: ["GET"] },
  { prefix: "/api/admin/security", requiredPermissions: ["system:maintenance"], methods: ["POST", "PUT", "PATCH"] },
  { prefix: "/api/admin/security", requiredPermissions: ["system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/performance", requiredPermissions: ["system:maintenance"] },
  { prefix: "/api/admin/operations", requiredPermissions: ["system:maintenance"] },
  { prefix: "/api/admin/analytics", requiredPermissions: ["admin:analytics"] },
  { prefix: "/api/admin/logs", requiredPermissions: ["system:logs"] },

  // Sessions require elevated control for destructive actions
  { prefix: "/api/admin/sessions", requiredPermissions: ["system:logs"], methods: ["GET", "POST", "PATCH"] },
  { prefix: "/api/admin/sessions", requiredPermissions: ["system:logs", "system:control"], methods: ["DELETE"] },

  // User management CRUD
  { prefix: "/api/admin/users", requiredPermissions: ["users:read"], methods: ["GET"] },
  { prefix: "/api/admin/users", requiredPermissions: ["users:write"], methods: ["POST", "PUT", "PATCH"] },
  { prefix: "/api/admin/users", requiredPermissions: ["users:write", "system:control"], methods: ["DELETE"] },
  { prefix: "/api/admin/flags", requiredPermissions: ["admin:settings"] },
]

const PROTECTED_UI_ROUTE_RULES: readonly RoutePermissionRule[] = [
  { prefix: "/admin", requiredPermissions: ["admin:access"] },
  { prefix: "/admin/performance", requiredPermissions: ["admin:analytics"] },
  { prefix: "/admin/email-analytics", requiredPermissions: ["admin:analytics"] },
  { prefix: "/admin/email-management", requiredPermissions: ["admin:settings"] },
  { prefix: "/admin/roles", requiredPermissions: ["admin:settings"] },
  { prefix: "/admin/users", requiredPermissions: ["users:read"] },
  { prefix: "/ecommerce/admin", requiredPermissions: ["admin:analytics"] },
]

export const BASELINE_ROLE_PERMISSIONS: Record<BaselineRole, readonly string[]> = {
  [BASELINE_ROLES.VIEWER]: VIEWER_PERMISSION_BUNDLE,
  [BASELINE_ROLES.OPERATOR]: OPERATOR_PERMISSION_BUNDLE,
  [BASELINE_ROLES.ADMIN]: ADMIN_PERMISSION_BUNDLE,
}

function resolveRouteRule(
  pathname: string,
  method: string,
  rules: readonly RoutePermissionRule[],
): readonly string[] {
  const normalizedMethod = method.toUpperCase()
  const matchingRules = rules.filter((rule) => {
    if (!(pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`))) {
      return false
    }

    if (!rule.methods) {
      return true
    }

    return rule.methods.includes(normalizedMethod)
  })

  if (matchingRules.length === 0) {
    return []
  }

  const matchedRule = matchingRules.reduce((mostSpecific, candidate) => {
    if (candidate.prefix.length > mostSpecific.prefix.length) {
      return candidate
    }

    return mostSpecific
  })

  return matchedRule.requiredPermissions
}

export function getRouteRequiredPermissions(pathname: string, method: string, scope: ProtectedRouteScope): readonly string[] {
  if (scope === "api") {
    return resolveRouteRule(pathname, method, ADMIN_API_ROUTE_RULES)
  }

  return resolveRouteRule(pathname, method, PROTECTED_UI_ROUTE_RULES)
}

export const LEGACY_ROLE_TO_BASELINE: Record<string, BaselineRole> = {
  [DEFAULT_ROLES.GUEST]: BASELINE_ROLES.VIEWER,
  [DEFAULT_ROLES.USER]: BASELINE_ROLES.OPERATOR,
  premium: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.MODERATOR]: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.BUSINESS_OPERATOR]: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.STARTUP_OPERATOR]: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.CUSTOMER_OPERATOR]: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.CUSTOMER_FINANCE]: BASELINE_ROLES.OPERATOR,
  [DEFAULT_ROLES.ADMIN]: BASELINE_ROLES.ADMIN,
  [DEFAULT_ROLES.BUSINESS_ADMIN]: BASELINE_ROLES.ADMIN,
  [DEFAULT_ROLES.STARTUP_ADMIN]: BASELINE_ROLES.ADMIN,
  [DEFAULT_ROLES.CUSTOMER_ADMIN]: BASELINE_ROLES.ADMIN,
  [DEFAULT_ROLES.SUPER_ADMIN]: BASELINE_ROLES.ADMIN,
  [CANONICAL_ADMIN_ROLES.VIEWER]: BASELINE_ROLES.VIEWER,
  [CANONICAL_ADMIN_ROLES.OPERATOR]: BASELINE_ROLES.OPERATOR,
  [CANONICAL_ADMIN_ROLES.ADMIN]: BASELINE_ROLES.ADMIN,
}

export const BASELINE_TO_STORAGE_ROLE: Record<BaselineRole, string> = {
  [BASELINE_ROLES.VIEWER]: BASELINE_ROLES.VIEWER,
  [BASELINE_ROLES.OPERATOR]: BASELINE_ROLES.OPERATOR,
  [BASELINE_ROLES.ADMIN]: BASELINE_ROLES.ADMIN,
}

export const ASSIGNABLE_ADMIN_ROLES = [
  DEFAULT_ROLES.SUPER_ADMIN,
  DEFAULT_ROLES.ADMIN,
  DEFAULT_ROLES.MODERATOR,
  DEFAULT_ROLES.USER,
  DEFAULT_ROLES.GUEST,
  "premium",
  BASELINE_ROLES.ADMIN,
  BASELINE_ROLES.OPERATOR,
  BASELINE_ROLES.VIEWER,
] as const

export function isAssignableAdminRole(role: string): role is (typeof ASSIGNABLE_ADMIN_ROLES)[number] {
  return (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role)
}

// Role hierarchy (higher roles inherit permissions from lower roles)
export const ROLE_HIERARCHY = {
  [DEFAULT_ROLES.SUPER_ADMIN]: [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.MODERATOR, DEFAULT_ROLES.USER, DEFAULT_ROLES.GUEST],
  [DEFAULT_ROLES.ADMIN]: [DEFAULT_ROLES.MODERATOR, DEFAULT_ROLES.USER, DEFAULT_ROLES.GUEST],
  [DEFAULT_ROLES.MODERATOR]: [DEFAULT_ROLES.USER, DEFAULT_ROLES.GUEST],
  [DEFAULT_ROLES.USER]: [DEFAULT_ROLES.GUEST],
  [DEFAULT_ROLES.GUEST]: [],
} as const

// Default permissions for each role
export const ROLE_PERMISSIONS = {
  [DEFAULT_ROLES.SUPER_ADMIN]: Object.keys(DEFAULT_PERMISSIONS),
  [DEFAULT_ROLES.ADMIN]: [
    "users:read",
    "users:write",
    "users:ban",
    "content:read",
    "content:write",
    "content:delete",
    "content:moderate",
    "admin:access",
    "admin:analytics",
    "admin:settings",
    "streams:create",
    "streams:moderate",
    "streams:analytics",
    "payments:read",
    "payments:write",
    "system:logs",
  ],
  [DEFAULT_ROLES.BUSINESS_ADMIN]: [
    "payments:read",
    "payments:write",
    "payments:refund",
    "admin:analytics",
    "admin:access",
  ],
  [DEFAULT_ROLES.BUSINESS_OPERATOR]: ["payments:read", "payments:write", "admin:access"],
  [DEFAULT_ROLES.CUSTOMER_ADMIN]: ["payments:read", "payments:write", "payments:refund", "admin:access"],
  [DEFAULT_ROLES.CUSTOMER_OPERATOR]: ["payments:read", "payments:write"],
  [DEFAULT_ROLES.CUSTOMER_FINANCE]: ["payments:read", "payments:refund", "admin:analytics"],
  [DEFAULT_ROLES.STARTUP_ADMIN]: ["payments:read", "payments:write", "streams:create", "admin:access"],
  [DEFAULT_ROLES.STARTUP_OPERATOR]: ["payments:read", "payments:write", "streams:create"],
  [DEFAULT_ROLES.MODERATOR]: [
    "users:read",
    "content:read",
    "content:write",
    "content:moderate",
    "admin:access",
    "streams:create",
    "streams:moderate",
  ],
  [DEFAULT_ROLES.USER]: ["content:read", "content:write", "streams:create"],
  premium: ["content:read", "content:write", "streams:create"],
  [DEFAULT_ROLES.GUEST]: ["content:read"],
  [BASELINE_ROLES.VIEWER]: [...BASELINE_ROLE_PERMISSIONS[BASELINE_ROLES.VIEWER]],
  [BASELINE_ROLES.OPERATOR]: [...BASELINE_ROLE_PERMISSIONS[BASELINE_ROLES.OPERATOR]],
  [BASELINE_ROLES.ADMIN]: [...BASELINE_ROLE_PERMISSIONS[BASELINE_ROLES.ADMIN]],
} as const

export const LEGACY_ROLE_PERMISSION_COMPATIBILITY: Partial<Record<string, readonly string[]>> = {
  [DEFAULT_ROLES.SUPER_ADMIN]: ROLE_PERMISSIONS[DEFAULT_ROLES.SUPER_ADMIN],
  [DEFAULT_ROLES.ADMIN]: ROLE_PERMISSIONS[DEFAULT_ROLES.ADMIN],
  [DEFAULT_ROLES.MODERATOR]: ROLE_PERMISSIONS[DEFAULT_ROLES.MODERATOR],
  [DEFAULT_ROLES.USER]: ROLE_PERMISSIONS[DEFAULT_ROLES.USER],
  [DEFAULT_ROLES.GUEST]: ROLE_PERMISSIONS[DEFAULT_ROLES.GUEST],
  premium: ROLE_PERMISSIONS.premium,
  [DEFAULT_ROLES.BUSINESS_ADMIN]: ROLE_PERMISSIONS[DEFAULT_ROLES.BUSINESS_ADMIN],
  [DEFAULT_ROLES.BUSINESS_OPERATOR]: ROLE_PERMISSIONS[DEFAULT_ROLES.BUSINESS_OPERATOR],
  [DEFAULT_ROLES.STARTUP_ADMIN]: ROLE_PERMISSIONS[DEFAULT_ROLES.STARTUP_ADMIN],
  [DEFAULT_ROLES.STARTUP_OPERATOR]: ROLE_PERMISSIONS[DEFAULT_ROLES.STARTUP_OPERATOR],
  [DEFAULT_ROLES.CUSTOMER_ADMIN]: ROLE_PERMISSIONS[DEFAULT_ROLES.CUSTOMER_ADMIN],
  [DEFAULT_ROLES.CUSTOMER_OPERATOR]: ROLE_PERMISSIONS[DEFAULT_ROLES.CUSTOMER_OPERATOR],
  [DEFAULT_ROLES.CUSTOMER_FINANCE]: ROLE_PERMISSIONS[DEFAULT_ROLES.CUSTOMER_FINANCE],
}

export function resolveBaselineRole(role: string): BaselineRole | null {
  if (role === BASELINE_ROLES.VIEWER || role === BASELINE_ROLES.OPERATOR || role === BASELINE_ROLES.ADMIN) {
    return role
  }

  return LEGACY_ROLE_TO_BASELINE[role] ?? null
}

export function normalizeRoleForStorage(role: string): string {
  const baselineRole = resolveBaselineRole(role)
  if (!baselineRole) return role
  return BASELINE_TO_STORAGE_ROLE[baselineRole]
}

export function getEffectiveRolePermissions(role: string): string[] {
  const baselineRole = resolveBaselineRole(role)
  if (baselineRole) {
    const compatibilityPermissions = LEGACY_ROLE_PERMISSION_COMPATIBILITY[role] ?? []
    return Array.from(new Set([...BASELINE_ROLE_PERMISSIONS[baselineRole], ...compatibilityPermissions]))
  }

  const directPermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
  if (directPermissions) {
    return Array.from(new Set(directPermissions))
  }

  return []
}

export class RBACManager {
  static hasScopedOperatorAccess(role: string, scope: OperatorScope): boolean {
    if (role === DEFAULT_ROLES.SUPER_ADMIN || role === DEFAULT_ROLES.ADMIN) {
      return true
    }

    if (scope === "business") {
      return (
        role === DEFAULT_ROLES.BUSINESS_ADMIN ||
        role === DEFAULT_ROLES.BUSINESS_OPERATOR ||
        role === DEFAULT_ROLES.CUSTOMER_ADMIN ||
        role === DEFAULT_ROLES.CUSTOMER_OPERATOR ||
        role === DEFAULT_ROLES.CUSTOMER_FINANCE
      )
    }

    return role === DEFAULT_ROLES.STARTUP_ADMIN || role === DEFAULT_ROLES.STARTUP_OPERATOR
  }

  static hasBillingActionAccess(role: string, action: BillingAction): boolean {
    if (role === DEFAULT_ROLES.SUPER_ADMIN || role === DEFAULT_ROLES.ADMIN) {
      return true
    }

    if (action === "finance:read") {
      return (
        role === DEFAULT_ROLES.BUSINESS_ADMIN ||
        role === DEFAULT_ROLES.CUSTOMER_ADMIN ||
        role === DEFAULT_ROLES.CUSTOMER_FINANCE ||
        role === DEFAULT_ROLES.STARTUP_ADMIN
      )
    }

    if (action === "billing:admin") {
      return role === DEFAULT_ROLES.BUSINESS_ADMIN || role === DEFAULT_ROLES.CUSTOMER_ADMIN || role === DEFAULT_ROLES.STARTUP_ADMIN
    }

    return (
      role === DEFAULT_ROLES.BUSINESS_ADMIN ||
      role === DEFAULT_ROLES.BUSINESS_OPERATOR ||
      role === DEFAULT_ROLES.CUSTOMER_ADMIN ||
      role === DEFAULT_ROLES.CUSTOMER_OPERATOR ||
      role === DEFAULT_ROLES.STARTUP_ADMIN ||
      role === DEFAULT_ROLES.STARTUP_OPERATOR
    )
  }

  /**
   * Check if a user has a specific permission
   */
  static async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const [user] = await sql`
        SELECT u.role, au.permissions 
        FROM users u
        LEFT JOIN admin_users au ON u.id = au.user_id
        WHERE u.id = ${userId}
      `

      if (!user) return false

      // Check role-based permissions
      const rolePermissions = getEffectiveRolePermissions(user.role)
      if (rolePermissions.includes(permission)) return true

      // Check custom permissions from admin_users table
      if (user.permissions && Array.isArray(user.permissions)) {
        return user.permissions.includes(permission)
      }

      return false
    } catch (error) {
      console.error("Error checking permission:", error)
      return false
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static async hasAnyPermission(userId: number, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static async hasAllPermissions(userId: number, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission))) {
        return false
      }
    }
    return true
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: number): Promise<string[]> {
    try {
      await ensureAdminAuthMigrationTables()
      const [user] = await sql`
        SELECT u.role,
               rg.role AS granted_role,
               COALESCE(
                 (
                   SELECT jsonb_agg(jsonb_build_object('permission_key', apo.permission_key, 'effect', apo.effect))
                   FROM admin_permission_overrides apo
                   WHERE apo.user_id = u.id
                 ),
                 '[]'::jsonb
               ) AS permission_overrides
        FROM users u
        LEFT JOIN admin_role_grants rg ON u.id = rg.user_id
        WHERE u.id = ${userId}
      `

      if (!user) return []

      const rolePermissions = getEffectiveRolePermissions(user.granted_role ?? user.role)
      const overrides = Array.isArray(user.permission_overrides) ? user.permission_overrides : []

      const grantedOverrides = overrides
        .filter((entry: { effect?: string }) => entry?.effect === "grant")
        .map((entry: { permission_key?: string }) => entry.permission_key)
      const revokedOverrides = new Set(
        overrides
          .filter((entry: { effect?: string }) => entry?.effect === "revoke")
          .map((entry: { permission_key?: string }) => entry.permission_key),
      )

      // Combine and deduplicate permissions
      return Array.from(new Set([...rolePermissions, ...grantedOverrides])).filter((permission) => !revokedOverrides.has(permission))
    } catch (error) {
      console.error("Error getting user permissions:", error)
      return []
    }
  }

  /**
   * Check if a role is higher than another role in the hierarchy
   */
  static isRoleHigher(role1: string, role2: string): boolean {
    const hierarchy = ROLE_HIERARCHY[role1 as keyof typeof ROLE_HIERARCHY] as readonly string[] | undefined
    return hierarchy ? hierarchy.includes(role2) : false
  }

  /**
   * Grant permission to a user
   */
  static async grantPermission(userId: number, permission: string, grantedBy: number): Promise<void> {
    try {
      await ensureAdminAuthMigrationTables()
      await sql`
        INSERT INTO admin_permission_overrides (user_id, permission_key, effect, updated_by, created_at, updated_at)
        VALUES (${userId}, ${permission}, 'grant', ${grantedBy}, NOW(), NOW())
        ON CONFLICT (user_id, permission_key)
        DO UPDATE SET effect = EXCLUDED.effect, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `

      // Log the action
      await sql`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES (${grantedBy}, 'grant_permission', 'user', ${userId}, ${JSON.stringify({ permission })}, NOW())
      `
    } catch (error) {
      console.error("Error granting permission:", error)
      throw error
    }
  }

  /**
   * Revoke permission from a user
   */
  static async revokePermission(userId: number, permission: string, revokedBy: number): Promise<void> {
    try {
      await ensureAdminAuthMigrationTables()
      await sql`
        INSERT INTO admin_permission_overrides (user_id, permission_key, effect, updated_by, created_at, updated_at)
        VALUES (${userId}, ${permission}, 'revoke', ${revokedBy}, NOW(), NOW())
        ON CONFLICT (user_id, permission_key)
        DO UPDATE SET effect = EXCLUDED.effect, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `

      // Log the action
      await sql`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES (${revokedBy}, 'revoke_permission', 'user', ${userId}, ${JSON.stringify({ permission })}, NOW())
      `
    } catch (error) {
      console.error("Error revoking permission:", error)
      throw error
    }
  }

  /**
   * Change user role
   */
  static async changeUserRole(userId: number, newRole: string, changedBy: number): Promise<void> {
    try {
      await ensureAdminAuthMigrationTables()
      const [oldUser] = await sql`SELECT role FROM users WHERE id = ${userId}`
      const normalizedRole = normalizeRoleForStorage(newRole)

      await sql`
        UPDATE users
        SET role = ${normalizedRole}, updated_at = NOW()
        WHERE id = ${userId}
      `

      await sql`
        INSERT INTO admin_role_grants (user_id, role, granted_by, created_at, updated_at)
        VALUES (${userId}, ${normalizedRole}, ${changedBy}, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, updated_at = NOW()
      `

      // Log the action
      await sql`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES (${changedBy}, 'change_role', 'user', ${userId}, ${JSON.stringify({
          oldRole: oldUser?.role,
          requestedRole: newRole,
          normalizedRole,
        })}, NOW())
      `
    } catch (error) {
      console.error("Error changing user role:", error)
      throw error
    }
  }
}
