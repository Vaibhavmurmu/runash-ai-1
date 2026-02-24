import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"
import { buildTenantScopePredicate, resolveSessionOrganizationId } from "@/lib/api/route-auth"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const sessionOrganizationId = resolveSessionOrganizationId(session)
    const tenantScope = buildTenantScopePredicate("u.sso_organization_id", sessionOrganizationId, 2)

    // Get user profile with stats
    const profile = await Database.query(
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const updates = await req.json()
    const sessionOrganizationId = resolveSessionOrganizationId(session)
    const tenantScope = buildTenantScopePredicate("sso_organization_id", sessionOrganizationId, 2)

    // Check if user can update this profile
    if (session.user.id !== userId && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update user profile
    const allowedFields = ["name", "username", "bio", "location", "website", "avatar_url"]
    const updateFields = Object.keys(updates).filter((key) => allowedFields.includes(key))

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(", ")
    const values = [userId, ...updateFields.map((field) => updates[field])]

    const result = await Database.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 AND ${tenantScope.predicate} RETURNING *`,
      [...values, ...tenantScope.values],
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
