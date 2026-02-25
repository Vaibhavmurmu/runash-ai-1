import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-middleware"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { replayWebhookEventById, rollbackWebhookEvent } from "@/lib/services/billing-webhook-service"
import { verifyInternalBillingWebhookSignature } from "@/app/api/internal/billing/webhook/_utils"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
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

  const { eventId } = await context.params
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 })
  }

  const reset = await rollbackWebhookEvent(eventId)
  if (!reset) {
    return NextResponse.json({ error: "Event is not eligible for rollback" }, { status: 409 })
  }

  const replayResult = await replayWebhookEventById(eventId)

  logApiEvent("info", "billing.webhook.rollback_replay_executed", {
    ...requestContext,
    userId: session?.user?.id ?? null,
    details: { eventId, reset, replayResult, authorizedBy },
  })

  return NextResponse.json({ ok: true, eventId, reset, replayResult })
}
