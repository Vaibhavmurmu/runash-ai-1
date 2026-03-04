import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getEmailSafetyConfig } from "@/lib/email"
import { runEmailProviderHealthCheck } from "@/lib/email-provider"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.management.diagnostics.read",
  })
  if (!auth.success) return auth.response

  const failFast = new URL(request.url).searchParams.get("failFast") === "true"
  const health = await runEmailProviderHealthCheck()

  if (failFast && !health.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "EMAIL_PROVIDER_UNHEALTHY",
        reason: health.reason,
        health,
      },
      { status: 503 },
    )
  }

  return NextResponse.json({
    success: health.ok,
    health,
    safetyPolicy: getEmailSafetyConfig(),
  })
}
