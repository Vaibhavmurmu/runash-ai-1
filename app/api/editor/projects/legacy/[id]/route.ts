import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { EditorProjectsService } from "@/lib/editor-projects"

const timelineSchema = z.object({
  duration: z.number().min(1).max(7200),
  fps: z.number().min(1).max(120),
  tracks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(100),
      type: z.enum(["video", "audio", "text", "overlay"]),
      segments: z.array(
        z.object({
          id: z.string().min(1),
          start: z.number().min(0),
          duration: z.number().min(0),
          label: z.string().min(1).max(200),
          assetId: z.string().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
        }),
      ),
    }),
  ),
})

const updateProjectSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(["draft", "processing", "published", "archived"]).optional(),
    selectedModel: z.string().min(1).max(100).optional(),
    timeline: timelineSchema.optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) {
    return auth.error
  }

  const { id } = params

  try {
    const project = await EditorProjectsService.getById(id, auth.userId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json({ error: "Failed to fetch editor project" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) {
    return auth.error
  }

  const { id } = params
  const json = await request.json().catch(() => null)
  const parsed = updateProjectSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const project = await EditorProjectsService.update(id, auth.userId, parsed.data)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json({ error: "Failed to update editor project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) {
    return auth.error
  }

  const { id } = params

  try {
    const removed = await EditorProjectsService.remove(id, auth.userId)
    if (!removed) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete editor project" }, { status: 500 })
  }
}
