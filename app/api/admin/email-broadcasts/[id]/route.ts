import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailBroadcastManager } from "@/lib/email-broadcasts"

function parseId(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.broadcasts.update",
  })
  if (!auth.success) return auth.response

  const resolved = await params
  const id = parseId(resolved.id)
  if (!id) {
    return NextResponse.json({ error: "Invalid broadcast id" }, { status: 400 })
  }

  try {
    const body = await request.json()

    const broadcast = await EmailBroadcastManager.updateBroadcast(id, {
      name: body.name,
      subject: body.subject,
      preheader: body.preheader,
      template_key: body.template_key,
      template_props: body.template_props,
      audience_filter: body.audience_filter,
      scheduled_at: body.scheduled_at,
      status: body.status,
    })

    if (!broadcast) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: broadcast })
  } catch (error) {
    console.error("Error updating email broadcast:", error)
    return NextResponse.json({ error: "Failed to update email broadcast" }, { status: 500 })
  }
}
