import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
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

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const project = await EditorProjectsService.getById(id, session.user.id)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json({ error: "Failed to fetch editor project" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params
  const json = await request.json().catch(() => null)
  const parsed = updateProjectSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const project = await EditorProjectsService.update(id, session.user.id, parsed.data)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json({ error: "Failed to update editor project" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const removed = await EditorProjectsService.remove(id, session.user.id)
    if (!removed) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete editor project" }, { status: 500 })
  }
}
