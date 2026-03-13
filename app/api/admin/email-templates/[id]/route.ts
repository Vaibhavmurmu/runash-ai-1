import { type NextRequest, NextResponse } from "next/server"
import { EmailTemplateManager } from "@/lib/email-templates"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.templates.item.read",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const templateId = Number.parseInt(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const template = await EmailTemplateManager.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error("Error fetching email template:", error)
    return NextResponse.json({ error: "Failed to fetch email template" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.templates.item.update",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const templateId = Number.parseInt(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const body = await request.json()
    const { change_notes, ...updateData } = body

    if (updateData.html_content) {
      const validation = EmailTemplateManager.validateTemplate(updateData.html_content, updateData.text_content)
      if (!validation.isValid) {
        return NextResponse.json({ error: "Template validation failed", details: validation.errors }, { status: 400 })
      }

      if (!updateData.variables) {
        updateData.variables = validation.variables.map((v) => ({ name: v, description: "" }))
      }
    }

    const template = await EmailTemplateManager.updateTemplate(templateId, updateData, auth.session.user.id, change_notes)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error("Error updating email template:", error)
    return NextResponse.json({ error: "Failed to update email template" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.templates.item.delete",
  })
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const templateId = Number.parseInt(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 })
    }

    const success = await EmailTemplateManager.deleteTemplate(templateId)
    if (!success) {
      return NextResponse.json({ error: "Template not found or cannot be deleted" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Template deleted successfully" })
  } catch (error) {
    console.error("Error deleting email template:", error)
    return NextResponse.json({ error: "Failed to delete email template" }, { status: 500 })
  }
}
