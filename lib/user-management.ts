import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: number
  name: string | null
  username: string | null
  email: string
  role: string | null
  email_verified: boolean
  email_verified_at: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  provider: string | null
  provider_id: string | null
  created_at: string
  updated_at: string
  pending_email: string | null
  sso_organization_id: number | null
}

export interface AdminUser {
  id: number
  user_id: number
  role: string
  permissions: any
  created_at: string
  updated_at: string
  created_by: number | null
}

export interface UserWithAdmin extends User {
  admin_role?: string
  admin_permissions?: any
  is_admin: boolean
}

export interface UserFilters {
  search?: string
  role?: string
  email_verified?: boolean
  provider?: string
  created_after?: string
  created_before?: string
  is_admin?: boolean
}

export interface PaginationOptions {
  page: number
  limit: number
}

export interface UserTenantScope {
  sessionOrganizationId?: number | null
  allowLegacyNullOrganization?: boolean
}

export interface UserListResponse {
  users: UserWithAdmin[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class UserManager {
  static async getUsers(
    filters: UserFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
    scope: UserTenantScope = {},
  ): Promise<UserListResponse> {
    const { page, limit } = pagination
    const offset = (page - 1) * limit

    const whereConditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Build WHERE conditions
    if (filters.search) {
      whereConditions.push(
        `(u.name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
      )
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.role) {
      whereConditions.push(`u.role = $${paramIndex}`)
      params.push(filters.role)
      paramIndex++
    }

    if (filters.email_verified !== undefined) {
      whereConditions.push(`u.email_verified = $${paramIndex}`)
      params.push(filters.email_verified)
      paramIndex++
    }

    if (filters.provider) {
      whereConditions.push(`u.provider = $${paramIndex}`)
      params.push(filters.provider)
      paramIndex++
    }

    if (filters.created_after) {
      whereConditions.push(`u.created_at >= $${paramIndex}`)
      params.push(filters.created_after)
      paramIndex++
    }

    if (filters.created_before) {
      whereConditions.push(`u.created_at <= $${paramIndex}`)
      params.push(filters.created_before)
      paramIndex++
    }

    if (filters.is_admin !== undefined) {
      if (filters.is_admin) {
        whereConditions.push(`au.id IS NOT NULL`)
      } else {
        whereConditions.push(`au.id IS NULL`)
      }
    }

    if (scope.sessionOrganizationId) {
      if (scope.allowLegacyNullOrganization ?? true) {
        whereConditions.push(`(u.sso_organization_id = $${paramIndex} OR u.sso_organization_id IS NULL)`)
      } else {
        whereConditions.push(`u.sso_organization_id = $${paramIndex}`)
      }
      params.push(scope.sessionOrganizationId)
      paramIndex++
    } else {
      whereConditions.push(`u.sso_organization_id IS NULL`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN admin_users au ON u.id = au.user_id
      ${whereClause}
    `

    const countResult = await sql(countQuery, params)
    const total = Number.parseInt(countResult[0].total)

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.*,
        au.role as admin_role,
        au.permissions as admin_permissions,
        CASE WHEN au.id IS NOT NULL THEN true ELSE false END as is_admin
      FROM users u
      LEFT JOIN admin_users au ON u.id = au.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const users = await sql(usersQuery, [...params, limit, offset])

    return {
      users: users as UserWithAdmin[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }


  static async createUser(input: {
    name: string
    username?: string
    email: string
    role: string
    organizationId?: number | null
  }, adminId: number): Promise<UserWithAdmin> {
    const result = await sql(
      `INSERT INTO users (name, username, email, role, email_verified, sso_organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, $5, NOW(), NOW())
       RETURNING id`,
      [input.name, input.username ?? null, input.email, input.role, input.organizationId ?? null],
    )

    const createdId = Number(result[0]?.id)

    await this.logActivity(adminId, "create_user", "user", createdId, {
      email: input.email,
      role: input.role,
    })

    const user = await this.getUserById(createdId)
    if (!user) {
      throw new Error("Created user could not be loaded")
    }

    return user
  }
  static async getUserById(id: number, scope: UserTenantScope = {}): Promise<UserWithAdmin | null> {
    const whereScope =
      scope.sessionOrganizationId == null
        ? `u.sso_organization_id IS NULL`
        : scope.allowLegacyNullOrganization ?? true
          ? `(u.sso_organization_id = $2 OR u.sso_organization_id IS NULL)`
          : `u.sso_organization_id = $2`
    const query = `
      SELECT 
        u.*,
        au.role as admin_role,
        au.permissions as admin_permissions,
        CASE WHEN au.id IS NOT NULL THEN true ELSE false END as is_admin
      FROM users u
      LEFT JOIN admin_users au ON u.id = au.user_id
      WHERE u.id = $1 AND ${whereScope}
    `

    const params = scope.sessionOrganizationId == null ? [id] : [id, scope.sessionOrganizationId]
    const result = await sql(query, params)
    return (result[0] as UserWithAdmin) || null
  }

  static async updateUser(id: number, updates: Partial<User>, adminId: number, scope: UserTenantScope = {}): Promise<UserWithAdmin> {
    const allowedFields = ["name", "username", "email", "role", "bio", "location", "website", "avatar_url"]
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update")
    }

    updateFields.push(`updated_at = NOW()`)
    params.push(id)

    const tenantClause =
      scope.sessionOrganizationId == null
        ? `sso_organization_id IS NULL`
        : scope.allowLegacyNullOrganization ?? true
          ? `(sso_organization_id = $${paramIndex + 1} OR sso_organization_id IS NULL)`
          : `sso_organization_id = $${paramIndex + 1}`
    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex} AND ${tenantClause}
      RETURNING *
    `

    const tenantParams = scope.sessionOrganizationId == null ? [] : [scope.sessionOrganizationId]
    const result = await sql(query, [...params, ...tenantParams])
    const updatedUser = result[0]

    // Log the activity
    await this.logActivity(adminId, "update_user", "user", id, {
      updated_fields: Object.keys(updates),
      changes: updates,
    })

    return this.getUserById(id, scope) as Promise<UserWithAdmin>
  }

  static async deleteUser(id: number, adminId: number, scope: UserTenantScope = {}): Promise<void> {
    // Soft delete - we'll add a deleted_at field or disable the user
    if (scope.sessionOrganizationId == null) {
      await sql(`UPDATE users SET role = 'disabled', updated_at = NOW() WHERE id = $1 AND sso_organization_id IS NULL`, [id])
    } else if (scope.allowLegacyNullOrganization ?? true) {
      await sql(`UPDATE users SET role = 'disabled', updated_at = NOW() WHERE id = $1 AND (sso_organization_id = $2 OR sso_organization_id IS NULL)`, [id, scope.sessionOrganizationId])
    } else {
      await sql(`UPDATE users SET role = 'disabled', updated_at = NOW() WHERE id = $1 AND sso_organization_id = $2`, [id, scope.sessionOrganizationId])
    }

    // Log the activity
    await this.logActivity(adminId, "delete_user", "user", id, {
      action: "User account disabled",
    })
  }

  static async promoteToAdmin(userId: number, role: string, permissions: any, adminId: number): Promise<void> {
    // Check if user is already an admin
    const existingAdmin = await sql(`SELECT id FROM admin_users WHERE user_id = $1`, [userId])

    if (existingAdmin.length > 0) {
      // Update existing admin
      await sql(
        `
        UPDATE admin_users 
        SET role = $1, permissions = $2, updated_at = NOW()
        WHERE user_id = $3
      `,
        [role, JSON.stringify(permissions), userId],
      )
    } else {
      // Create new admin
      await sql(
        `
        INSERT INTO admin_users (user_id, role, permissions, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
        [userId, role, JSON.stringify(permissions), adminId],
      )
    }

    // Log the activity
    await this.logActivity(adminId, "promote_to_admin", "user", userId, {
      role,
      permissions,
    })
  }

  static async revokeAdmin(userId: number, adminId: number): Promise<void> {
    await sql(`DELETE FROM admin_users WHERE user_id = $1`, [userId])

    // Log the activity
    await this.logActivity(adminId, "revoke_admin", "user", userId, {
      action: "Admin privileges revoked",
    })
  }

  static async getUserActivity(userId: number, limit = 50): Promise<any[]> {
    const query = `
      SELECT 
        aal.*,
        au.name as admin_name
      FROM admin_activity_logs aal
      LEFT JOIN users au ON aal.admin_id = au.id
      WHERE aal.target_type = 'user' AND aal.target_id = $1
      ORDER BY aal.created_at DESC
      LIMIT $2
    `

    return await sql(query, [userId, limit])
  }

  static async getUserStats(): Promise<any> {
    const stats = await sql(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d
      FROM users
      WHERE role != 'disabled'
    `)

    const providerStats = await sql(`
      SELECT provider, COUNT(*) as count
      FROM users
      WHERE role != 'disabled'
      GROUP BY provider
      ORDER BY count DESC
    `)

    const roleStats = await sql(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE role != 'disabled'
      GROUP BY role
      ORDER BY count DESC
    `)

    return {
      overview: stats[0],
      by_provider: providerStats,
      by_role: roleStats,
    }
  }

  static async bulkUpdateUsers(userIds: number[], updates: Partial<User>, adminId: number): Promise<void> {
    const allowedFields = ["role", "email_verified"]
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update")
    }

    updateFields.push(`updated_at = NOW()`)
    params.push(userIds)

    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = ANY($${paramIndex})
    `

    await sql(query, params)

    // Log the activity
    await this.logActivity(adminId, "bulk_update_users", "user", null, {
      user_ids: userIds,
      updates,
      count: userIds.length,
    })
  }

  private static async logActivity(
    adminId: number,
    action: string,
    targetType: string,
    targetId: number | null,
    details: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await sql(
      `
      INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
      [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress, userAgent],
    )
  }
}
