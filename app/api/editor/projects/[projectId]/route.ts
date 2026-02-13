import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { getProjectById, sql } from "@/lib/editor/repository"

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params

  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params

  const body = await request.json().catch(() => ({}))

  await sql`
    UPDATE editor_projects
    SET
      name=COALESCE(${body.name ?? null}, name),
      status=COALESCE(${body.status ?? null}, status),
      metadata=COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata),
      active_timeline_id=COALESCE(${body.activeTimelineId ?? null}, active_timeline_id),
      updated_at=now()
    WHERE id=${projectId} AND owner_id=${auth.userId}
  `

  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project })
}

export async function DELETE(_: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId } = params

  const result = await sql`DELETE FROM editor_projects WHERE id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!result.length) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ deleted: true, projectId })
}
