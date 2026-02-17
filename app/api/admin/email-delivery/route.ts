import { type NextRequest, NextResponse } from "next/server"
import { EmailDeliveryTracker } from "@/lib/email-delivery"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.delivery.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get("campaign_id") ? Number.parseInt(searchParams.get("campaign_id")!) : undefined
    const template_id = searchParams.get("template_id") ? Number.parseInt(searchParams.get("template_id")!) : undefined
    const status = searchParams.get("status") || undefined
    const recipient_email = searchParams.get("recipient_email") || undefined
    const date_from = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined
    const date_to = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50
    const offset = searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : 0

    const result = await EmailDeliveryTracker.getDeliveries({
      campaign_id,
      template_id,
      status,
      recipient_email,
      date_from,
      date_to,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data: result.deliveries,
      total: result.total,
      pagination: { limit, offset, hasMore: offset + limit < result.total },
    })
  } catch (error) {
    console.error("Error fetching email deliveries:", error)
    return NextResponse.json({ error: "Failed to fetch email deliveries" }, { status: 500 })
  }
}
