import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql, touchProject } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId } = params

  const assets = await sql`SELECT * FROM editor_assets WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY created_at DESC`
  return NextResponse.json({ assets })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json()

  const [asset] = await sql`
    INSERT INTO editor_assets (project_id, owner_id, source, upload_file_id, storage_key, access_url, mime_type, size_bytes, metadata)
    VALUES (
      ${projectId},
      ${auth.userId},
      ${body.source || "upload"},
      ${body.uploadFileId ?? null},
      ${body.storageKey},
      ${body.accessUrl ?? null},
      ${body.mimeType || "application/octet-stream"},
      ${body.sizeBytes || 0},
      ${JSON.stringify(body.metadata || {})}::jsonb
    )
    RETURNING *
  `

  await touchProject(projectId, auth.userId)
  return NextResponse.json({ asset }, { status: 201 })
}
