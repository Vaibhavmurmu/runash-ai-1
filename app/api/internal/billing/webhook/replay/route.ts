import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requirePermission } from "@/lib/auth-middleware"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { replayFailedWebhookEvents } from "@/lib/services/billing-webhook-service"

export async function POST(request: NextRequest) {
  const requestContext = createRequestLogContext(request)
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hasAdminRole = session.user.role === "admin" || session.user.role === "super_admin"
  const hasPermission = await requirePermission(session.user.id, "admin:access")

  if (!hasAdminRole && !hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const payload = (await request.json().catch(() => ({}))) as { limit?: number }
  const limit = Number.isFinite(payload.limit) ? Number(payload.limit) : 25

  const result = await replayFailedWebhookEvents(limit)

  logApiEvent("info", "billing.webhook.replay_executed", {
    ...requestContext,
    userId: session.user.id,
    details: {
      limit,
      scanned: result.scanned,
      replayed: result.replayed,
      failed: result.failed,
    },
  })

  return NextResponse.json({ ok: true, ...result })
}
