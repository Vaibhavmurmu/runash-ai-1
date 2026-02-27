import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const jobs = projectId
    ? await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} AND project_id=${projectId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} ORDER BY created_at DESC LIMIT 25`

  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const body = await request.json()
  if (!body?.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const [project] = await sql`SELECT id FROM editor_projects WHERE id=${body.projectId} AND owner_id=${auth.userId}`
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [job] = await sql`
    INSERT INTO editor_render_jobs (project_id, owner_id, requested_by, status, payload, result, output_asset_id)
    VALUES (
      ${body.projectId},
      ${auth.userId},
      ${auth.userId},
      'queued',
      ${JSON.stringify(body.payload || {})}::jsonb,
      ${JSON.stringify({ attemptCount: 0, startedAt: null, finishedAt: null, lastError: null })}::jsonb,
      null
    )
    RETURNING *
  `

  return NextResponse.json({ job }, { status: 201 })
}
