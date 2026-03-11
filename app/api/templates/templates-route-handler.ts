import { ZodError } from "zod"
import { NextResponse } from "next/server"
import type { ServerAuthSession } from "@/lib/auth"
import { parseCreateTemplateInput } from "@/lib/domains/templates"
import type { ListTemplatesFilters, TemplateRecord, TemplateViewerContext } from "@/lib/repositories/templates"

export interface TemplatesRouteHandlerDeps {
  getSession: () => Promise<ServerAuthSession | null>
  listTemplatesForViewer: (viewer: TemplateViewerContext, filters: ListTemplatesFilters) => Promise<TemplateRecord[]>
  createTemplate: (
    input: ReturnType<typeof parseCreateTemplateInput>,
    actor: { userId: string; workspaceId: number | null; author: string },
  ) => Promise<TemplateRecord>
}

function buildViewer(session: ServerAuthSession): TemplateViewerContext {
  return {
    userId: session.user.id,
    role: session.user.role,
    workspaceId: session.user.ssoOrganization,
  }
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

    const templates = await deps.listTemplatesForViewer(buildViewer(session), { category, tags })
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

    const templateInput = parseCreateTemplateInput(await req.json())
    const template = await deps.createTemplate(templateInput, {
      userId: session.user.id,
      workspaceId: session.user.ssoOrganization,
      author: session.user.name || "Anonymous",
    })

    return NextResponse.json({ template })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid template payload" }, { status: 400 })
    }

    console.error("Create template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
