import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { requireEditingEnabled } from "@/app/api/editor/projects/_permissions"
import { buildInvalidRequestError, editorAssetCreateRequestSchema } from "@/lib/api/contracts"
import { createEditorAsset } from "@/lib/editor/assets"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params

  const assets = await sql`SELECT * FROM editor_assets WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY created_at DESC`
  return NextResponse.json({ assets })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const editingGuard = await requireEditingEnabled(projectId, auth.userId)
  if (editingGuard) return editingGuard
  const body = await request.json().catch(() => ({}))

  const parsedBody = editorAssetCreateRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const asset = await createEditorAsset({
    projectId,
    ownerId: auth.userId,
    source: parsedBody.data.source,
    uploadFileId: parsedBody.data.uploadFileId ?? null,
    storageKey: parsedBody.data.storageKey,
    accessUrl: parsedBody.data.accessUrl ?? null,
    mimeType: parsedBody.data.mimeType,
    sizeBytes: parsedBody.data.sizeBytes,
    metadata: parsedBody.data.metadata,
  })

  return NextResponse.json({ asset }, { status: 201 })
}
