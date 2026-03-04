import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-middleware"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { replayFailedWebhookEvents } from "@/lib/services/billing-webhook-service"
import { verifyInternalBillingWebhookSignature } from "@/app/api/internal/billing/webhook/_utils"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const requestContext = createRequestLogContext(request)
  const session = await getServerAuthSession()
  const signatureCheck = await verifyInternalBillingWebhookSignature(request)

  let authorizedBy = "session"
  if (!session?.user?.id) {
    if (!signatureCheck.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    authorizedBy = "signature"
  } else {
    const hasAdminRole = session.user.role === "admin" || session.user.role === "super_admin"
    const hasPermission = await requirePermission(session.user.id, "admin:access")

    if (!hasAdminRole && !hasPermission && !signatureCheck.ok) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    if (!hasAdminRole && !hasPermission && signatureCheck.ok) {
      authorizedBy = "signature"
    }
  }

  const payload = (() => {
    try {
      return (signatureCheck.rawBody ? JSON.parse(signatureCheck.rawBody || "{}") : {}) as { limit?: number }
    } catch {
      return {} as { limit?: number }
    }
  })()
  const limit = Number.isFinite(payload.limit) ? Number(payload.limit) : 25

  const result = await replayFailedWebhookEvents(limit)

  logApiEvent("info", "billing.webhook.replay_executed", {
    ...requestContext,
    userId: session?.user?.id ?? null,
    details: {
      limit,
      scanned: result.scanned,
      replayed: result.replayed,
      failed: result.failed,
      authorizedBy,
    },
  })

  return NextResponse.json({ ok: true, ...result })
}
