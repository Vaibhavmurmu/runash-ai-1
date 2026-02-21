import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(_: Request, { params }: { params: { projectId: string; assetId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, assetId } = params

  const [asset] = await sql`SELECT * FROM editor_assets WHERE id=${assetId} AND project_id=${projectId} AND owner_id=${auth.userId}`
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

  return NextResponse.json({ asset })
}

export async function PATCH(request: Request, { params }: { params: { projectId: string; assetId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, assetId } = params
  const body = await request.json()

  const [asset] = await sql`
    UPDATE editor_assets
    SET
      access_url=COALESCE(${body.accessUrl ?? null}, access_url),
      metadata=COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata),
      updated_at=now()
    WHERE id=${assetId} AND project_id=${projectId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  await touchProject(projectId, auth.userId)
  return NextResponse.json({ asset })
}

export async function DELETE(_: Request, { params }: { params: { projectId: string; assetId: string } }) {
  const auth = await requireEditorUser()
  if ("error" in auth) return auth.error
  const { projectId, assetId } = params

  const rows = await sql`DELETE FROM editor_assets WHERE id=${assetId} AND project_id=${projectId} AND owner_id=${auth.userId} RETURNING id`
  if (!rows.length) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ deleted: true, assetId })
}
