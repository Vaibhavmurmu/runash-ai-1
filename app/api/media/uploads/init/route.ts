import { NextResponse, type NextRequest } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/db"
import { CloudStorage } from "@/lib/cloud-storage"

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

function inferKind(mimeType: string): "video" | "audio" | "image" {
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "video"
}

export async function POST(request: NextRequest) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream"
  const sizeBytes = Number(body.sizeBytes)
  const originalFileName = typeof body.fileName === "string" ? body.fileName : "media.bin"
  const projectId = typeof body.projectId === "string" ? body.projectId : null

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Invalid sizeBytes" }, { status: 400 })
  }

  const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "-")
  const storageKey = `media/uploads/users/${auth.userId}/${Date.now()}-${sanitizedName}`

  const [asset] = await sql`
    INSERT INTO media_assets (
      owner_id,
      project_id,
      kind,
      status,
      source_storage_key,
      source_bucket,
      source_mime_type,
      source_size_bytes,
      metadata
    )
    VALUES (
      ${auth.userId},
      ${projectId},
      ${inferKind(mimeType)},
      'initiated',
      ${storageKey},
      ${process.env.AWS_S3_BUCKET ?? null},
      ${mimeType},
      ${sizeBytes},
      ${JSON.stringify({ originalFileName })}::jsonb
    )
    RETURNING *
  `

  const expiresInSeconds = 15 * 60
  const uploadUrl = await CloudStorage.getSignedUploadUrl(storageKey, mimeType, expiresInSeconds)

  return NextResponse.json({
    asset: {
      id: asset.id,
      status: asset.status,
      kind: asset.kind,
      sourceStorageKey: asset.source_storage_key,
      sourceMimeType: asset.source_mime_type,
      sourceSizeBytes: Number(asset.source_size_bytes),
      projectId: asset.project_id,
      createdAt: asset.created_at,
    },
    upload: {
      method: "PUT",
      url: uploadUrl,
      headers: {
        "Content-Type": mimeType,
      },
      expiresInSeconds,
      storageKey,
    },
  })
}
