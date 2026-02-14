import { neon } from "@neondatabase/serverless"

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
} as const

export type OperatorScope = "business" | "startup"

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
  [DEFAULT_ROLES.GUEST]: ["content:read"],
} as const

export class RBACManager {
  static hasScopedOperatorAccess(role: string, scope: OperatorScope): boolean {
    if (role === DEFAULT_ROLES.SUPER_ADMIN || role === DEFAULT_ROLES.ADMIN) {
      return true
    }

    if (scope === "business") {
      return role === DEFAULT_ROLES.BUSINESS_ADMIN || role === DEFAULT_ROLES.BUSINESS_OPERATOR
    }

    return role === DEFAULT_ROLES.STARTUP_ADMIN || role === DEFAULT_ROLES.STARTUP_OPERATOR
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
      const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
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
      const [user] = await sql`
        SELECT u.role, au.permissions 
        FROM users u
        LEFT JOIN admin_users au ON u.id = au.user_id
        WHERE u.id = ${userId}
      `

      if (!user) return []

      const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
      const customPermissions = user.permissions && Array.isArray(user.permissions) ? user.permissions : []

      // Combine and deduplicate permissions
      return [...new Set([...rolePermissions, ...customPermissions])]
    } catch (error) {
      console.error("Error getting user permissions:", error)
      return []
    }
  }

  /**
   * Check if a role is higher than another role in the hierarchy
   */
  static isRoleHigher(role1: string, role2: string): boolean {
    const hierarchy = ROLE_HIERARCHY[role1 as keyof typeof ROLE_HIERARCHY]
    return hierarchy ? hierarchy.includes(role2 as any) : false
  }

  /**
   * Grant permission to a user
   */
  static async grantPermission(userId: number, permission: string, grantedBy: number): Promise<void> {
    try {
      // Check if admin_users record exists
      const [existingAdmin] = await sql`
        SELECT id, permissions FROM admin_users WHERE user_id = ${userId}
      `

      if (existingAdmin) {
        // Update existing permissions
        const currentPermissions = existingAdmin.permissions || []
        if (!currentPermissions.includes(permission)) {
          const updatedPermissions = [...currentPermissions, permission]
          await sql`
            UPDATE admin_users 
            SET permissions = ${JSON.stringify(updatedPermissions)}, updated_at = NOW()
            WHERE user_id = ${userId}
          `
        }
      } else {
        // Create new admin_users record
        await sql`
          INSERT INTO admin_users (user_id, permissions, created_by, created_at, updated_at)
          VALUES (${userId}, ${JSON.stringify([permission])}, ${grantedBy}, NOW(), NOW())
        `
      }

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
      const [existingAdmin] = await sql`
        SELECT id, permissions FROM admin_users WHERE user_id = ${userId}
      `

      if (existingAdmin && existingAdmin.permissions) {
        const updatedPermissions = existingAdmin.permissions.filter((p: string) => p !== permission)
        await sql`
          UPDATE admin_users 
          SET permissions = ${JSON.stringify(updatedPermissions)}, updated_at = NOW()
          WHERE user_id = ${userId}
        `

        // Log the action
        await sql`
          INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
          VALUES (${revokedBy}, 'revoke_permission', 'user', ${userId}, ${JSON.stringify({ permission })}, NOW())
        `
      }
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
      const [oldUser] = await sql`SELECT role FROM users WHERE id = ${userId}`

      await sql`
        UPDATE users 
        SET role = ${newRole}, updated_at = NOW()
        WHERE id = ${userId}
      `

      // Log the action
      await sql`
        INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, created_at)
        VALUES (${changedBy}, 'change_role', 'user', ${userId}, ${JSON.stringify({
          oldRole: oldUser?.role,
          newRole,
        })}, NOW())
      `
    } catch (error) {
      console.error("Error changing user role:", error)
      throw error
    }
  }
}
