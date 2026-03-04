import { NextResponse } from "next/server"

import { queryOne } from "@/lib/db"
import { enforceTenantBoundaryForUser } from "@/lib/api/route-auth"

type TenantGuardResult =
  | { ok: true; shouldMigrateLegacyOrganization: boolean }
  | { ok: false; response: Response }

export async function enforceAdminUserTenantBoundary(
  userId: number,
  sessionOrganizationId: number | null | undefined,
): Promise<TenantGuardResult> {
  const tenantGuard = await enforceTenantBoundaryForUser(userId, sessionOrganizationId, async (id) => {
    const targetUser = await queryOne<{ id: number; sso_organization_id: number | null }>(
      `SELECT id, sso_organization_id FROM users WHERE id = $1`,
      [id],
    )

    return targetUser?.sso_organization_id
  })

  if (!tenantGuard.ok) {
    if (tenantGuard.status === 404) {
      return { ok: false, response: NextResponse.json({ message: "User not found" }, { status: 404 }) }
    }

    return { ok: false, response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, shouldMigrateLegacyOrganization: tenantGuard.shouldMigrateLegacyOrganization }
}

export async function migrateLegacyUserOrganizationIfNeeded(
  userId: number,
  sessionOrganizationId: number | null | undefined,
  shouldMigrate: boolean,
): Promise<void> {
  if (!shouldMigrate || !sessionOrganizationId) {
    return
  }

  await queryOne(
    `UPDATE users SET sso_organization_id = COALESCE(sso_organization_id, $2), updated_at = NOW() WHERE id = $1 RETURNING id`,
    [userId, sessionOrganizationId],
  )
}
