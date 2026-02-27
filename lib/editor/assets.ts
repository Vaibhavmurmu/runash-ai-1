import { sql, touchProject } from "@/lib/editor/repository"

export interface CreateEditorAssetInput {
  projectId: string
  ownerId: string
  source?: "upload" | "storage"
  uploadFileId?: string | null
  storageKey: string
  accessUrl?: string | null
  mimeType?: string
  sizeBytes?: number
  metadata?: Record<string, unknown>
}

export async function createEditorAsset(input: CreateEditorAssetInput) {
  const [asset] = await sql`
    INSERT INTO editor_assets (project_id, owner_id, source, upload_file_id, storage_key, access_url, mime_type, size_bytes, metadata)
    VALUES (
      ${input.projectId},
      ${input.ownerId},
      ${input.source ?? "upload"},
      ${input.uploadFileId ?? null},
      ${input.storageKey},
      ${input.accessUrl ?? null},
      ${input.mimeType ?? "application/octet-stream"},
      ${input.sizeBytes ?? 0},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
    RETURNING *
  `

  await touchProject(input.projectId, input.ownerId)
  return asset
}
