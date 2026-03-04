import { NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { getPaymentAuthLinkageHealth } from "@/lib/auth/plugins/runash-payment"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.payment_auth.health.read",
  })
  if (!auth.success) return auth.response

  const health = await getPaymentAuthLinkageHealth()
  return NextResponse.json({ data: health })
}
