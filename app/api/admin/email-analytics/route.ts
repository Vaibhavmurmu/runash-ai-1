import { type NextRequest, NextResponse } from "next/server"
import { EmailAnalytics } from "@/lib/email-analytics"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.analytics.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const date_from = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined
    const date_to = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined
    const campaign_id = searchParams.get("campaign_id") ? Number.parseInt(searchParams.get("campaign_id")!) : undefined
    const template_id = searchParams.get("template_id") ? Number.parseInt(searchParams.get("template_id")!) : undefined

    const analytics = await EmailAnalytics.getAnalytics({ date_from, date_to, campaign_id, template_id })

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error("Error fetching email analytics:", error)
    return NextResponse.json({ error: "Failed to fetch email analytics" }, { status: 500 })
  }
}
