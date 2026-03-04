import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { listEnterpriseProviderConfigs, upsertEnterpriseProviderConfig } from "@/lib/auth/plugins/sso-enterprise"
import { recordAdminAuditLog, respondInternalServerError } from "@/lib/api/admin-route-utils"

const providerSchema = z.object({
  organizationId: z.number().int().positive(),
  providerType: z.enum(["oidc", "oauth2", "saml2"]),
  providerName: z.string().min(2),
  issuerUrl: z.string().url().optional(),
  authorizationUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  samlSsoUrl: z.string().url().optional(),
  samlEntityId: z.string().optional(),
  samlCertificate: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  attributeMapping: z.record(z.string(), z.string()).optional(),
  orgMappings: z.record(z.string(), z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.identity.providers.read",
  })
  if (!auth.success) return auth.response

  try {
    const providers = await listEnterpriseProviderConfigs()
    return NextResponse.json({ data: providers })
  } catch (error) {
    return respondInternalServerError(request, error, {
      event: "admin.identity.providers.read.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_IDENTITY_PROVIDER_READ_FAILED",
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.identity.providers.upsert",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const payload = providerSchema.parse(body)
    const provider = await upsertEnterpriseProviderConfig(payload)

    await recordAdminAuditLog({
      actorUserId: auth.userId,
      action: "identity.provider.upserted",
      entityType: "sso_provider",
      entityId: provider.id,
      metadata: {
        organizationId: payload.organizationId,
        providerType: payload.providerType,
        mappingKeys: Object.keys(payload.orgMappings ?? {}),
      },
    })

    return NextResponse.json({ data: provider })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid provider payload", issues: error.issues }, { status: 400 })
    }

    return respondInternalServerError(request, error, {
      event: "admin.identity.providers.upsert.failed",
      requestId: auth.requestId,
      userId: String(auth.userId),
      errorCode: "ADMIN_IDENTITY_PROVIDER_UPSERT_FAILED",
    })
  }
}
