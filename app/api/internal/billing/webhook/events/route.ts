import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requirePermission } from "@/lib/auth-middleware"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { listWebhookEvents } from "@/lib/services/billing-webhook-service"

const ALLOWED_STATUSES = new Set(["received", "processed", "failed", "dead_letter"])
type WebhookEventStatus = "received" | "processed" | "failed" | "dead_letter"

export async function GET(request: NextRequest) {
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

  const statusParam = request.nextUrl.searchParams.get("status")
  const status = statusParam && ALLOWED_STATUSES.has(statusParam) ? (statusParam as WebhookEventStatus) : undefined
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50

  const events = await listWebhookEvents({ status, limit })

  logApiEvent("info", "billing.webhook.diagnostics_viewed", {
    ...requestContext,
    userId: session.user.id,
    details: { status: status ?? "all", limit, count: events.length },
  })

  return NextResponse.json({ ok: true, events })
}
