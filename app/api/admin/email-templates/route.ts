import { type NextRequest, NextResponse } from "next/server"
import { EmailTemplateManager } from "@/lib/email-templates"
import { requireAdminAuthorization } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:analytics"],
    auditEvent: "admin.email.templates.read",
  })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const is_active = searchParams.get("is_active") ? searchParams.get("is_active") === "true" : undefined
    const search = searchParams.get("search") || undefined
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 20
    const offset = searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : 0

    const result = await EmailTemplateManager.getTemplates({ category, is_active, search, limit, offset })

    return NextResponse.json({
      success: true,
      data: result.templates,
      total: result.total,
      pagination: { limit, offset, hasMore: offset + limit < result.total },
    })
  } catch (error) {
    console.error("Error fetching email templates:", error)
    return NextResponse.json({ error: "Failed to fetch email templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.templates.create",
  })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { name, subject, html_content, text_content, category, description, variables } = body

    if (!name || !subject || !html_content) {
      return NextResponse.json({ error: "Name, subject, and HTML content are required" }, { status: 400 })
    }

    const validation = EmailTemplateManager.validateTemplate(html_content, text_content)
    if (!validation.isValid) {
      return NextResponse.json({ error: "Template validation failed", details: validation.errors }, { status: 400 })
    }

    const template = await EmailTemplateManager.createTemplate({
      name,
      subject,
      html_content,
      text_content,
      category,
      description,
      variables: variables || validation.variables.map((v) => ({ name: v, description: "" })),
      created_by: auth.session.user.id,
    })

    if (!template) {
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error("Error creating email template:", error)
    return NextResponse.json({ error: "Failed to create email template" }, { status: 500 })
  }
}
