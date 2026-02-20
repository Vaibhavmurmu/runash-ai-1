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

const createProjectSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  selectedModel: z.string().min(1).max(100).optional(),
  timeline: timelineSchema.optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET() {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const projects = await EditorProjectsService.listByUser(session.user.id)
    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ error: "Failed to fetch editor projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const project = await EditorProjectsService.create(session.user.id, parsed.data)
    return NextResponse.json({ project }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create editor project" }, { status: 500 })
  }
}
