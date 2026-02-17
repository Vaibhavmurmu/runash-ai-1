import { type NextRequest, NextResponse } from "next/server"
import { EmailAnalytics } from "@/lib/email-analytics"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.analytics.realtime.read",
  })
  if (!auth.success) return auth.response

  try {
    const metrics = await EmailAnalytics.getRealTimeMetrics()

    return NextResponse.json({ success: true, data: metrics })
  } catch (error) {
    console.error("Error fetching real-time email metrics:", error)
    return NextResponse.json({ error: "Failed to fetch real-time metrics" }, { status: 500 })
  }
}
