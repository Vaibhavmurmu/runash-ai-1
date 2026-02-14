import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const jobs = projectId
    ? await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} AND project_id=${projectId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM editor_render_jobs WHERE owner_id=${auth.userId} ORDER BY created_at DESC LIMIT 25`

  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error

  const body = await request.json()

  const [job] = await sql`
    INSERT INTO editor_render_jobs (project_id, owner_id, requested_by, status, payload, result, output_asset_id)
    VALUES (${body.projectId}, ${auth.userId}, ${auth.userId}, 'queued', ${JSON.stringify(body.payload || {})}::jsonb, '{}'::jsonb, ${body.outputAssetId ?? null})
    RETURNING *
  `

  return NextResponse.json({ job }, { status: 201 })
}
