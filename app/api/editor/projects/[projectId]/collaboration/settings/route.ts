import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { getProjectById } from "@/lib/editor/repository"
import { getCollaborationSettings, updateCollaborationSettings } from "@/lib/editor/collaboration-repository"

const collaborationSettingsSchema = z.object({
  allowComments: z.boolean(),
  allowEditing: z.boolean(),
  showActivityLog: z.boolean(),
})

export async function GET(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const settings = await getCollaborationSettings(projectId, auth.userId)
  return NextResponse.json({ settings })
}

export async function PATCH(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = collaborationSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await updateCollaborationSettings({
    projectId,
    ownerId: auth.userId,
    settings: parsed.data,
  })

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ settings: parsed.data })
}
