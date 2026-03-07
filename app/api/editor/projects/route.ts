import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { getProjectById, sql } from "@/lib/editor/repository"

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  selectedModel: z.string().trim().min(1).max(100).optional(),
  quickStart: z.enum(["blank", "import", "template"]).default("blank"),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: Request) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  try {
    const projects = await sql`
      SELECT id, owner_id, name, status, metadata, active_timeline_id, created_at, updated_at
      FROM editor_projects
      WHERE owner_id = ${auth.userId}
      ORDER BY updated_at DESC
      LIMIT 50
    `

    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ error: "Failed to fetch editor projects" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const json = await request.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const name = parsed.data.name ?? parsed.data.title ?? "Untitled Project"
  const metadata = {
    ...(parsed.data.metadata ?? {}),
    description: parsed.data.description ?? "",
    selectedModel: parsed.data.selectedModel ?? "wan-2.1",
    quickStart: parsed.data.quickStart,
  }

  const timelineName = parsed.data.quickStart === "template" ? "Template timeline" : "Main timeline"
  const primaryTrackLabel = parsed.data.quickStart === "import" ? "Imported media" : "Primary video"

  try {
    const [project] = await sql`
      INSERT INTO editor_projects (owner_id, name, status, metadata)
      VALUES (${auth.userId}, ${name}, 'draft', ${JSON.stringify(metadata)}::jsonb)
      RETURNING id
    `

    const [timeline] = await sql`
      INSERT INTO editor_timelines (project_id, owner_id, name, frame_rate, duration_seconds, metadata)
      VALUES (${project.id}, ${auth.userId}, ${timelineName}, 30, 10, ${JSON.stringify({ quickStart: parsed.data.quickStart })}::jsonb)
      RETURNING id
    `

    await sql`
      INSERT INTO editor_tracks (timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
      VALUES (${timeline.id}, ${project.id}, ${auth.userId}, ${primaryTrackLabel}, 0, 'video', '{}'::jsonb)
    `

    await sql`
      UPDATE editor_projects
      SET active_timeline_id = ${timeline.id}, updated_at = now()
      WHERE id = ${project.id} AND owner_id = ${auth.userId}
    `

    const createdProject = await getProjectById(auth.userId, project.id)
    return NextResponse.json({ project: createdProject }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create editor project" }, { status: 500 })
  }
}
