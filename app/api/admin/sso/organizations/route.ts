import { type NextRequest, NextResponse } from "next/server"
import { createSSOOrganization } from "@/lib/sso"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { queryMany } from "@/lib/db"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().min(1, "Domain is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  ssoEnabled: z.boolean().optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.enum(["user", "admin", "moderator"]).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.sso.organizations.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { name, domain, slug, ssoEnabled, autoProvision, defaultRole } = createOrgSchema.parse(body)

    const organization = await createSSOOrganization(name, domain, slug, auth.userId, {
      ssoEnabled,
      autoProvision,
      defaultRole,
    })

    if (!organization) {
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
    }

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "organization.created",
      entityType: "sso_organization",
      entityId: organization.id,
      metadata: {
        slug,
        ssoEnabled: organization.sso_enabled,
        autoProvision: organization.auto_provision,
      },
    })

    return NextResponse.json(organization)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.create.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SSO_ORGANIZATION_CREATE_FAILED",
    })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.sso.organizations.read",
  })
  if (!auth.success) return auth.response

  try {
    const organizations = await queryMany<{
      id: number
      name: string
      domain: string
      slug: string
      sso_enabled: boolean
      auto_provision: boolean
      default_role: string
      is_active: boolean
      updated_at: string
    }>(
      `SELECT id, name, domain, slug, sso_enabled, auto_provision, default_role, is_active, updated_at
       FROM sso_organizations
       ORDER BY updated_at DESC`,
      [],
    )

    return NextResponse.json({ data: organizations })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.sso.organizations.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_SSO_ORGANIZATION_READ_FAILED",
    })
  }
}
