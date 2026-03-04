import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-middleware"
import { getServerAuthSession } from "@/lib/auth/session"
import { verifyInternalBillingWebhookSignature } from "@/app/api/internal/billing/webhook/_utils"
import { listWebhookDeadLetters, retryDeadLetterWebhookEvent, replayFailedWebhookEvents } from "@/lib/services/billing-webhook-service"

async function authorize(request: NextRequest) {
  const session = await getServerAuthSession()
  const signatureCheck = await verifyInternalBillingWebhookSignature(request.clone())

  if (!session?.user?.id) {
    return signatureCheck.ok
  }

  const hasAdminRole = session.user.role === "admin" || session.user.role === "super_admin"
  const hasPermission = await requirePermission(session.user.id, "admin:access")
  return hasAdminRole || hasPermission || signatureCheck.ok
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100")
  const rows = await listWebhookDeadLetters(limit)
  return NextResponse.json({ ok: true, data: rows })
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: { eventId?: string; limit?: number } = {}
  try {
    payload = (await request.json()) as { eventId?: string; limit?: number }
  } catch {
    payload = {}
  }

  if (payload.eventId) {
    const retried = await retryDeadLetterWebhookEvent(payload.eventId)
    return NextResponse.json({ ok: true, ...retried })
  }

  const batch = await replayFailedWebhookEvents(Number.isFinite(payload.limit) ? Number(payload.limit) : 25)
  return NextResponse.json({ ok: true, ...batch })
}
