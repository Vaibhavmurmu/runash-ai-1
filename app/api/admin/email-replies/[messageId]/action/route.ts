import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { handleReplyAction } from "@/lib/email-inbound/service"

function parseMessageId(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.replies.action",
  })
  if (!auth.success) return auth.response

  const { messageId: messageIdParam } = await params
  const inboundMessageId = parseMessageId(messageIdParam)
  if (!inboundMessageId) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const action = body?.action as "approve_send" | "save_edit" | "skip"
    if (!["approve_send", "save_edit", "skip"].includes(action)) {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    }

    const result = await handleReplyAction({
      inboundMessageId,
      action,
      editedBody: body?.editedBody,
      adminUserId: auth.adminUser?.id,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error applying reply action:", error)
    return NextResponse.json({ error: "Failed to apply reply action" }, { status: 500 })
  }
}
