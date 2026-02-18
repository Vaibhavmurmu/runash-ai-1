import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailAnalytics, parseEmailAnalyticsFilters } from "@/lib/email-analytics"
import { FilterValidationError } from "@/lib/email-filter-utils"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.analytics.broadcasts.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const filters = parseEmailAnalyticsFilters({
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      campaign_id: searchParams.get("campaign_id") || undefined,
      template_id: searchParams.get("template_id") || undefined,
    })

    const data = await EmailAnalytics.getBroadcastFunnels(filters)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error fetching broadcast analytics:", error)
    return NextResponse.json({ error: "Failed to fetch broadcast analytics" }, { status: 500 })
  }
}
