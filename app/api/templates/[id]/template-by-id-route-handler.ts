import { NextResponse } from "next/server"
import type { ServerAuthSession } from "@/lib/auth"
import type { TemplateRecord, TemplateViewerContext } from "@/lib/repositories/templates"

export interface TemplateByIdRouteDeps {
  getSession: () => Promise<ServerAuthSession | null>
  getTemplateById: (id: string) => Promise<TemplateRecord | null>
  getTemplateByIdForViewer: (id: string, viewer: TemplateViewerContext) => Promise<TemplateRecord | null>
}

export async function handleGetTemplateById(templateId: string, deps: TemplateByIdRouteDeps) {
  try {
    const session = await deps.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingTemplate = await deps.getTemplateById(templateId)
    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = await deps.getTemplateByIdForViewer(templateId, {
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
      scope: template.scope,
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
