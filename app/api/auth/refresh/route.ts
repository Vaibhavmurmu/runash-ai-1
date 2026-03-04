import { type NextRequest, NextResponse } from "next/server"
import { getAuthSessionFromHeaders } from "@/lib/auth"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

export async function POST(request: NextRequest) {
  const session = await getAuthSessionFromHeaders(request.headers)

  if (!session?.session || !session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  recordAuthMetric("auth.session.refresh", { endpoint: "refresh" })
  await recordSecurityAuditEvent({
    event: "auth.session.refresh",
    resource: "auth_session",
    request,
    details: { endpoint: "refresh", userId: session.user.id },
  })

  return NextResponse.json(session)
}
