import { NextResponse } from "next/server"
import type { DashboardStreamTemplate } from "@/lib/types/dashboard-streams"

type UpdateTemplateRequest = Partial<Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">>

type Dependencies = {
  requireUserId: (request: Request) => Promise<string | Response>
  updateTemplate: (
    userId: string,
    id: string,
    input: UpdateTemplateRequest,
  ) => Promise<DashboardStreamTemplate | null>
  deleteTemplate: (userId: string, id: string) => Promise<boolean>
}

export async function handleTemplatePut(request: Request, templateId: string, deps: Dependencies) {
  const scopedUserId = await deps.requireUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request.json().catch(() => null)) as UpdateTemplateRequest | null
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const updated = await deps.updateTemplate(scopedUserId, templateId, {
    ...body,
    name: body.name?.trim(),
    title: body.title?.trim(),
    description: body.description?.trim(),
  })

  if (!updated) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function handleTemplateDelete(request: Request, templateId: string, deps: Dependencies) {
  const scopedUserId = await deps.requireUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const deleted = await deps.deleteTemplate(scopedUserId, templateId)
  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
