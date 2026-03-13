import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { queryOne } from "@/lib/db"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const orgIdSchema = z.coerce.number().int().positive()

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  ssoEnabled: z.boolean().optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.enum(["user", "admin", "moderator"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ organizationId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.sso.organizations.update",
  })
  if (!auth.success) return auth.response

  try {
    const organizationId = orgIdSchema.parse(params.organizationId)
    const body = updateOrganizationSchema.parse(await request.json())

    const updatedOrganization = await queryOne(
      `UPDATE sso_organizations
       SET name = COALESCE($2, name),
           domain = COALESCE($3, domain),
           slug = COALESCE($4, slug),
           sso_enabled = COALESCE($5, sso_enabled),
           auto_provision = COALESCE($6, auto_provision),
           default_role = COALESCE($7, default_role),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, domain, slug, sso_enabled, auto_provision, default_role, is_active, updated_at`,
      [
        organizationId,
        body.name ?? null,
        body.domain ?? null,
        body.slug ?? null,
        body.ssoEnabled ?? null,
        body.autoProvision ?? null,
        body.defaultRole ?? null,
        body.isActive ?? null,
      ],
    )

    if (!updatedOrganization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "organization.updated",
      entityType: "sso_organization",
      entityId: organizationId,
      metadata: { fields: Object.keys(body) },
    })

    return NextResponse.json({ data: updatedOrganization })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid organization payload", issues: error.issues }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.update.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SSO_ORGANIZATION_UPDATE_FAILED",
    })
  }
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ organizationId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.sso.organizations.deactivate",
  })
  if (!auth.success) return auth.response

  try {
    const organizationId = orgIdSchema.parse(params.organizationId)
    const deactivatedOrganization = await queryOne(
      `UPDATE sso_organizations
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, slug, is_active, updated_at`,
      [organizationId],
    )

    if (!deactivatedOrganization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "organization.deactivated",
      entityType: "sso_organization",
      entityId: organizationId,
    })

    return NextResponse.json({ data: deactivatedOrganization })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.deactivate.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SSO_ORGANIZATION_DEACTIVATE_FAILED",
    })
  }
}
