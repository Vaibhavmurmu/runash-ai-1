import { type NextRequest, NextResponse } from "next/server"
import { EmailDeliveryTracker } from "@/lib/email-delivery"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import {
  FilterValidationError,
  normalizePagination,
  parseOptionalDate,
  parseOptionalInteger,
  validateDateRange,
} from "@/lib/email-filter-utils"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.delivery.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = parseOptionalInteger(searchParams.get("campaign_id"), "campaign_id", { min: 1 })
    const template_id = parseOptionalInteger(searchParams.get("template_id"), "template_id", { min: 1 })
    const status = searchParams.get("status") || undefined
    const recipient_email = searchParams.get("recipient_email") || undefined
    const date_from = parseOptionalDate(searchParams.get("date_from"), "date_from")
    const date_to = parseOptionalDate(searchParams.get("date_to"), "date_to")
    validateDateRange(date_from, date_to)
    const { limit, offset } = normalizePagination(
      parseOptionalInteger(searchParams.get("limit"), "limit"),
      parseOptionalInteger(searchParams.get("offset"), "offset"),
      { defaultLimit: 50, maxLimit: 200 },
    )

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
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error fetching email deliveries:", error)
    return NextResponse.json({ error: "Failed to fetch email deliveries" }, { status: 500 })
  }
}
