import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailContactManager } from "@/lib/email-contacts"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.contacts.update",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = Number.parseInt(id, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
    }

    const body = await request.json()
    if (body.status && !EmailContactManager.isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid contact status" }, { status: 400 })
    }

    const updated = await EmailContactManager.updateContact(parsedId, body)
    if (!updated) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating email contact:", error)
    return NextResponse.json({ error: "Failed to update email contact" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.contacts.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const parsedId = Number.parseInt(id, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
    }

    const deleted = await EmailContactManager.deleteContact(parsedId)
    if (!deleted) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Contact deleted successfully" })
  } catch (error) {
    console.error("Error deleting email contact:", error)
    return NextResponse.json({ error: "Failed to delete email contact" }, { status: 500 })
  }
}
