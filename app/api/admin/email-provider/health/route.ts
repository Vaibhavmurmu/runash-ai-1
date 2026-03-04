import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getEmailSafetyConfig } from "@/lib/email"
import { getEmailProviderDiagnostics, runEmailProviderHealthCheck } from "@/lib/email-provider"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.provider.health.read",
  })
  if (!auth.success) return auth.response

  const health = await runEmailProviderHealthCheck()

  return NextResponse.json({
    success: health.ok,
    health,
    diagnostics: getEmailProviderDiagnostics(),
    safetyPolicy: getEmailSafetyConfig(),
  })
}
