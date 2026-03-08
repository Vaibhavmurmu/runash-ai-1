import { NextResponse } from "next/server"
import type { ServerAuthSession } from "@/lib/auth"
import type { CreateTemplateInput, TemplateRecord } from "@/lib/repositories/templates"

export interface TemplatesRouteHandlerDeps {
  getSession: () => Promise<ServerAuthSession | null>
  listTemplates: (filters: { category?: string | null; tags?: string[] }) => Promise<TemplateRecord[]>
  createTemplate: (input: CreateTemplateInput) => Promise<TemplateRecord>
}

export async function handleGetTemplates(req: Request, deps: TemplatesRouteHandlerDeps) {
  try {
    const session = await deps.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const tags = searchParams.getAll("tags")

    const templates = await deps.listTemplates({ category, tags })
    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Get templates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function handlePostTemplate(req: Request, deps: TemplatesRouteHandlerDeps) {
  try {
    const session = await deps.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateData = await req.json()
    const requiredFields = ["name", "category", "html", "css"]
    for (const field of requiredFields) {
      if (!templateData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 })
      }
    }

    const template = await deps.createTemplate({
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      thumbnailUrl: templateData.thumbnailUrl,
      variables: Array.isArray(templateData.variables) ? templateData.variables : [],
      html: templateData.html,
      css: templateData.css,
      javascript: templateData.javascript,
      tags: Array.isArray(templateData.tags) ? templateData.tags : [],
      author: session.user.name || "Anonymous",
      ownerUserId: session.user.id,
      workspaceId: session.user.ssoOrganization,
      isPremium: false,
      accessLevel: "public",
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
