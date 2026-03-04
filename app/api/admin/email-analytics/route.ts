import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { FilterValidationError } from "@/lib/email-filter-utils"
import { EmailAnalytics, parseEmailAnalyticsFilters } from "@/lib/email-analytics"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.analytics.read",
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

    const [analytics, broadcastFunnels, topLinks, templatePerformance, audienceSegments] = await Promise.all([
      EmailAnalytics.getAnalytics(filters),
      EmailAnalytics.getBroadcastFunnels(filters),
      EmailAnalytics.getTopLinks(filters),
      EmailAnalytics.getTemplatePerformanceOverTime(filters),
      EmailAnalytics.getAudienceSegmentComparison(filters),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        broadcast_funnels: broadcastFunnels,
        top_links: topLinks,
        template_performance_over_time: templatePerformance,
        audience_segment_comparison: audienceSegments,
      },
    })
  } catch (error) {
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error fetching email analytics:", error)
    return NextResponse.json({ error: "Failed to fetch email analytics" }, { status: 500 })
  }
}
