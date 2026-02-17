import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-middleware"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { replayWebhookEventById, rollbackWebhookEvent } from "@/lib/services/billing-webhook-service"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const requestContext = createRequestLogContext(request)
  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hasAdminRole = session.user.role === "admin" || session.user.role === "super_admin"
  const hasPermission = await requirePermission(session.user.id, "admin:access")

  if (!hasAdminRole && !hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
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
    userId: session.user.id,
    details: { eventId, reset, replayResult },
  })

  return NextResponse.json({ ok: true, eventId, reset, replayResult })
}
