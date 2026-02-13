import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { getProjectById, sql } from "@/lib/editor/repository"

export async function GET(request: Request) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  if (projectId) {
    const project = await getProjectById(auth.userId, projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  }

  const projects = await sql`
    SELECT id, owner_id, name, status, active_timeline_id, created_at, updated_at
    FROM editor_projects
    WHERE owner_id=${auth.userId}
    ORDER BY updated_at DESC
  `

  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const name = (body.name || "Untitled Project").toString()

  const [project] = await sql`
    INSERT INTO editor_projects (owner_id, name, status, metadata)
    VALUES (${auth.userId}, ${name}, 'draft', ${JSON.stringify(body.metadata || {})}::jsonb)
    RETURNING *
  `

  const [timeline] = await sql`
    INSERT INTO editor_timelines (project_id, owner_id, name, frame_rate, duration_seconds, metadata)
    VALUES (${project.id}, ${auth.userId}, 'Main Timeline', 30, 10, '{}'::jsonb)
    RETURNING *
  `

  await sql`
    INSERT INTO editor_tracks (timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
    VALUES (${timeline.id}, ${project.id}, ${auth.userId}, 'Primary', 0, 'video', '{}'::jsonb)
  `

  await sql`
    UPDATE editor_projects
    SET active_timeline_id=${timeline.id}, updated_at=now()
    WHERE id=${project.id}
  `

  const hydrated = await getProjectById(auth.userId, project.id)
  return NextResponse.json({ project: hydrated }, { status: 201 })
}
