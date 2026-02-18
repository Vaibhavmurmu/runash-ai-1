import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailBroadcastManager } from "@/lib/email-broadcasts"

function parseId(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.broadcasts.send",
  })
  if (!auth.success) return auth.response

  const resolved = await params
  const id = parseId(resolved.id)
  if (!id) {
    return NextResponse.json({ error: "Invalid broadcast id" }, { status: 400 })
  }

  try {
    const result = await EmailBroadcastManager.sendBroadcast(id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error sending broadcast:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send broadcast" }, { status: 500 })
  }
}
