import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { createEditorAsset } from "@/lib/editor/assets"
import { sql } from "@/lib/editor/repository"

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

  const asset = await createEditorAsset({
    projectId,
    ownerId: auth.userId,
    source: body.source,
    uploadFileId: body.uploadFileId ?? null,
    storageKey: body.storageKey,
    accessUrl: body.accessUrl ?? null,
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
    metadata: body.metadata,
  })

  return NextResponse.json({ asset }, { status: 201 })
}
