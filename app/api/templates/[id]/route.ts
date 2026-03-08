import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { getTemplateById, getTemplateByIdForViewer } from "@/lib/repositories/templates"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateId = params.id
    const existingTemplate = await getTemplateById(templateId)

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = await getTemplateByIdForViewer(templateId, {
      userId: session.user.id,
      role: session.user.role,
      workspaceId: session.user.ssoOrganization,
    })

    if (!template) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      thumbnailUrl: template.thumbnailUrl,
      variables: template.variables,
      html: template.html,
      css: template.css,
      ...(template.javascript ? { javascript: template.javascript } : {}),
      isPremium: template.isPremium,
      tags: template.tags,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      downloadCount: template.downloadCount,
      rating: template.rating,
      author: template.author,
      counters: {
        downloadCount: template.downloadCount,
        viewCount: template.viewCount,
        usageCount: template.usageCount,
        rating: template.rating,
        ratingCount: template.ratingCount,
      },
    })
  } catch (error) {
    console.error("Get template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
