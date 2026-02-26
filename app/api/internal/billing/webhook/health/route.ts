import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { requirePermission } from "@/lib/auth-middleware"
import { verifyInternalBillingWebhookSignature } from "@/app/api/internal/billing/webhook/_utils"
import { getWebhookReconciliationHealthMetrics } from "@/lib/services/billing-webhook-service"

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession()
  const signatureCheck = await verifyInternalBillingWebhookSignature(request)

  if (session?.user?.id) {
    const hasAdminRole = session.user.role === "admin" || session.user.role === "super_admin"
    const hasPermission = await requirePermission(session.user.id, "admin:access")
    if (!hasAdminRole && !hasPermission && !signatureCheck.ok) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }
  } else if (!signatureCheck.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const metrics = await getWebhookReconciliationHealthMetrics()
  return NextResponse.json({ ok: true, metrics })
}
