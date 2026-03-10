import { NextResponse } from "next/server"
import type { DashboardStreamTemplate, DashboardStreamTemplatesResponse } from "@/lib/types/dashboard-streams"

type CreateTemplateRequest = Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">

type Dependencies = {
  requireUserId: (request: Request) => Promise<string | Response>
  listTemplates: (userId: string) => Promise<DashboardStreamTemplate[]>
  createTemplate: (userId: string, input: CreateTemplateRequest) => Promise<DashboardStreamTemplate>
}

export async function handleTemplatesGet(request: Request, deps: Dependencies) {
  const scopedUserId = await deps.requireUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const templates = await deps.listTemplates(scopedUserId)
  const payload: DashboardStreamTemplatesResponse = { templates }
  return NextResponse.json(payload)
}

export async function handleTemplatesPost(request: Request, deps: Dependencies) {
  const scopedUserId = await deps.requireUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request.json().catch(() => null)) as Partial<CreateTemplateRequest> | null
  if (!body?.name?.trim() || !body?.title?.trim()) {
    return NextResponse.json({ error: "Missing template name or title" }, { status: 400 })
  }

  const template = await deps.createTemplate(scopedUserId, {
    name: body.name.trim(),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    duration: typeof body.duration === "number" ? body.duration : 60,
    platforms: Array.isArray(body.platforms) ? body.platforms : [],
    thumbnail: body.thumbnail,
    tags: Array.isArray(body.tags) ? body.tags : [],
    category: body.category ?? "Gaming",
    isPublic: body.isPublic ?? true,
  })

  return NextResponse.json(template, { status: 201 })
}
