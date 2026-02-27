import { NextResponse } from "next/server"

import { queryOne } from "@/lib/db"
import { evaluateTenantBoundaryAccess } from "@/lib/api/route-auth"

type TenantGuardResult =
  | { ok: true; shouldMigrateLegacyOrganization: boolean }
  | { ok: false; response: Response }

export async function enforceAdminUserTenantBoundary(
  userId: number,
  sessionOrganizationId: number | null | undefined,
): Promise<TenantGuardResult> {
  const targetUser = await queryOne<{ id: number; sso_organization_id: number | null }>(
    `SELECT id, sso_organization_id FROM users WHERE id = $1`,
    [userId],
  )

  if (!targetUser) {
    return { ok: false, response: NextResponse.json({ message: "User not found" }, { status: 404 }) }
  }

  const tenantCheck = evaluateTenantBoundaryAccess(sessionOrganizationId, targetUser.sso_organization_id, {
    allowLegacyNullOrganization: true,
  })

  if (!tenantCheck.allowed) {
    return { ok: false, response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, shouldMigrateLegacyOrganization: tenantCheck.shouldMigrateLegacyOrganization }
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
