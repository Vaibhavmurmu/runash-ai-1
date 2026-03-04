import { NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { listEnterpriseProviderConfigs } from "@/lib/auth/plugins/sso-enterprise"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.identity.health.read",
  })
  if (!auth.success) return auth.response

  const providers = await listEnterpriseProviderConfigs()

  const protocols = ["oidc", "oauth", "saml"] as const
  const status = protocols.map((protocol) => {
    const protocolProviders = providers.filter((provider) => provider.provider_type === protocol)
    return {
      protocol,
      configured: protocolProviders.length,
      health: protocolProviders.length > 0 ? "configured" : "missing",
      lastUpdatedAt: protocolProviders[0]?.updated_at ?? null,
    }
  })

  return NextResponse.json({ data: status })
}
