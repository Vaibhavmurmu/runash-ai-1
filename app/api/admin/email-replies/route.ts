import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { listReplyActionAudit, listReplyInbox } from "@/lib/email-inbound/service"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.replies.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1), 100)
    const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0", 10), 0)

    const items = await listReplyInbox(limit, offset)
    const itemsWithAudit = await Promise.all(
      items.map(async (item) => ({
        ...item,
        audit: await listReplyActionAudit(Number(item.thread_id)),
      })),
    )

    return NextResponse.json({
      success: true,
      data: itemsWithAudit,
      total: items.length,
      pagination: { limit, offset, hasMore: items.length === limit },
    })
  } catch (error) {
    console.error("Error listing email replies:", error)
    return NextResponse.json({ error: "Failed to load reply inbox" }, { status: 500 })
  }
}
