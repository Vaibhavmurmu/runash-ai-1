import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailBroadcastManager } from "@/lib/email-broadcasts"
import { FilterValidationError, normalizePagination, parseOptionalInteger } from "@/lib/email-filter-utils"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.broadcasts.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || undefined
    const search = searchParams.get("search") || undefined
    const { limit, offset } = normalizePagination(
      parseOptionalInteger(searchParams.get("limit"), "limit"),
      parseOptionalInteger(searchParams.get("offset"), "offset"),
      { defaultLimit: 20, maxLimit: 200 },
    )

    const result = await EmailBroadcastManager.getBroadcasts({ limit, offset, status, search })

    return NextResponse.json({
      success: true,
      data: result.broadcasts,
      templates: EmailBroadcastManager.listTemplates(),
      total: result.total,
      pagination: { limit, offset, hasMore: offset + limit < result.total },
    })
  } catch (error) {
    if (error instanceof FilterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Error fetching email broadcasts:", error)
    return NextResponse.json({ error: "Failed to fetch email broadcasts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.broadcasts.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    if (!body?.name || !body?.subject || !body?.template_key) {
      return NextResponse.json({ error: "name, subject, and template_key are required" }, { status: 400 })
    }

    const broadcast = await EmailBroadcastManager.createBroadcast({
      name: body.name,
      subject: body.subject,
      preheader: body.preheader,
      template_key: body.template_key,
      template_props: body.template_props,
      audience_filter: body.audience_filter,
      scheduled_at: body.scheduled_at || null,
      created_by: auth.adminUser?.id,
    })

    return NextResponse.json({ success: true, data: broadcast })
  } catch (error) {
    console.error("Error creating email broadcast:", error)
    return NextResponse.json({ error: "Failed to create email broadcast" }, { status: 500 })
  }
}
