import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailAnalytics, parseEmailAnalyticsFilters } from "@/lib/email-analytics"
import { FilterValidationError } from "@/lib/email-filter-utils"

function escapeCsv(value: string | number | null | undefined): string {
  const normalized = value === null || value === undefined ? "" : String(value)
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`
  }
  return normalized
}

function toCsv(rows: Array<Record<string, string | number | null | undefined>>, columns: string[]): string {
  const header = columns.join(",")
  const body = rows
    .map((row) => columns.map((column) => escapeCsv(row[column])).join(","))
    .join("\n")

  return `${header}\n${body}`
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.analytics.export.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const report = searchParams.get("report") || "broadcasts"
    const filters = parseEmailAnalyticsFilters({
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      campaign_id: searchParams.get("campaign_id") || undefined,
      template_id: searchParams.get("template_id") || undefined,
    })

    let csv = ""
    if (report === "links") {
      const rows = await EmailAnalytics.getTopLinks(filters)
      csv = toCsv(rows, ["url", "total_clicks", "unique_clicks", "broadcast_count", "template_count"])
    } else if (report === "templates") {
      const rows = await EmailAnalytics.getTemplatePerformanceOverTime(filters)
      csv = toCsv(rows, ["template_id", "template_name", "bucket_date", "sent", "opened", "clicked", "open_rate", "click_rate"])
    } else if (report === "segments") {
      const rows = await EmailAnalytics.getAudienceSegmentComparison(filters)
      csv = toCsv(rows, ["segment", "total_sent", "delivered", "opened", "clicked", "bounced", "delivery_rate", "open_rate", "click_rate"])
    } else {
      const rows = await EmailAnalytics.getBroadcastFunnels(filters)
      csv = toCsv(rows, [
        "broadcast_id",
        "broadcast_name",
        "template_id",
        "template_name",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "unsubscribed",
        "bounced",
        "delivery_rate",
        "open_rate",
        "click_rate",
        "unsubscribe_rate",
        "bounce_rate",
      ])
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"email-analytics-${report}.csv\"`,
      },
    })
  } catch (error) {
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error exporting email analytics:", error)
    return NextResponse.json({ error: "Failed to export email analytics" }, { status: 500 })
  }
}
