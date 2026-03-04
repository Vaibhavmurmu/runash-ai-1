import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

export async function POST(request: NextRequest) {
  const response = await auth.api.signOut({
    headers: request.headers,
  })

  recordAuthMetric("auth.session.revoked", { endpoint: "sign-out" })
  await recordSecurityAuditEvent({
    event: "auth.session.revoked",
    resource: "auth_session",
    request,
    details: { endpoint: "sign-out" },
  })

  return NextResponse.json(response)
}
