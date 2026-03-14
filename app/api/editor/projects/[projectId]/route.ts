import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { getProjectById, sql } from "@/lib/editor/repository"
import { claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"

export async function GET(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params

  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project, version: project.version })
}

export async function PATCH(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params

  const body = await request.json().catch(() => ({}))
  const version = parseExpectedVersion(request, body)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "project.update",
    targetType: "project",
    targetId: projectId,
  })
  if (!claim.ok) return claim.response

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

  return NextResponse.json({ project, version: claim.projectVersion })
}

export async function DELETE(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const { searchParams } = new URL(request.url)
  const version = parseExpectedVersion(request, { version: searchParams.get("version") })
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "project.delete",
    targetType: "project",
    targetId: projectId,
  })
  if (!claim.ok) return claim.response

  const result = await sql`DELETE FROM editor_projects WHERE id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!result.length) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ deleted: true, projectId, version: claim.projectVersion })
}
