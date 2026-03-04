import { type NextRequest, NextResponse } from "next/server"

import type { ServerAuthSession } from "@/lib/auth/session"
import {
  buildTenantScopePredicate,
  enforceTenantBoundaryForUser,
  resolveSessionOrganizationId,
} from "@/lib/api/route-auth"

type ProfileRouteDependencies = {
  getSession: () => Promise<ServerAuthSession | null>
  query: (sql: string, values?: unknown[]) => Promise<any[]>
}

export async function handleGetUserProfile(
  _req: NextRequest,
  params: { id: string },
  deps: ProfileRouteDependencies,
): Promise<Response> {
  try {
    const session = await deps.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const sessionOrganizationId = resolveSessionOrganizationId(session)
    const tenantScope = buildTenantScopePredicate("u.sso_organization_id", sessionOrganizationId, 2)

    const profile = await deps.query(
      `
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM user_followers WHERE user_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM user_followers WHERE follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM streams WHERE user_id = u.id) as stream_count,
        (SELECT COALESCE(SUM(sa.total_views), 0) FROM stream_analytics sa 
         JOIN streams s ON sa.stream_id = s.id WHERE s.user_id = u.id) as total_views
      FROM users u
      WHERE u.id = $1
        AND ${tenantScope.predicate}
    `,
      [userId, ...tenantScope.values],
    )

    if (!profile[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(profile[0])
  } catch (error) {
    console.error("Get user profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function handlePatchUserProfile(
  req: NextRequest,
  params: { id: string },
  deps: ProfileRouteDependencies,
): Promise<Response> {
  try {
    const session = await deps.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const updates = await req.json()
    const sessionOrganizationId = resolveSessionOrganizationId(session)

    if (session.user.id !== userId && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const allowedFields = ["name", "username", "bio", "location", "website", "avatar_url"]
    const updateFields = Object.keys(updates).filter((key) => allowedFields.includes(key))

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const tenantCheck = await enforceTenantBoundaryForUser(userId, sessionOrganizationId, async (id) => {
      const existing = await deps.query(`SELECT sso_organization_id FROM users WHERE id = $1`, [id])
      const targetProfile = existing[0] as { sso_organization_id: number | null } | undefined
      return targetProfile?.sso_organization_id
    })

    if (!tenantCheck.ok) {
      if (tenantCheck.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateTenantScope = buildTenantScopePredicate("sso_organization_id", sessionOrganizationId, 2, {
      allowLegacyNullOrganization: true,
    })

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(", ")
    const values = [userId, ...updateFields.map((field) => updates[field])]

    const migrationClause =
      tenantCheck.shouldMigrateLegacyOrganization && sessionOrganizationId
        ? `, sso_organization_id = COALESCE(sso_organization_id, $${values.length + 1})`
        : ""
    const migrationValues =
      tenantCheck.shouldMigrateLegacyOrganization && sessionOrganizationId ? [sessionOrganizationId] : []

    const result = await deps.query(
      `UPDATE users SET ${setClause}${migrationClause}, updated_at = NOW() WHERE id = $1 AND ${updateTenantScope.predicate} RETURNING *`,
      [...values, ...migrationValues, ...updateTenantScope.values],
    )

    if (!result[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Update user profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
