import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { CloudStorage } from "@/lib/cloud-storage"


const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
])

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const PUBLIC_URL_TTL_SECONDS = 24 * 60 * 60
const PRIVATE_URL_TTL_SECONDS = 15 * 60

function sanitizePathSegment(input: string, fallback: string): string {
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return sanitized || fallback
}

async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const projectId = sanitizePathSegment((formData.get("projectId") as string) || "default", "default")
    const privacyRaw = ((formData.get("privacy") as string) || "private").toLowerCase()
    const privacy = privacyRaw === "public" ? "public" : "private"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const safeFileName = sanitizePathSegment(file.name, "upload")
    const timestamp = Date.now()
    const storageKey = `uploads/users/${session.user.id}/projects/${projectId}/${timestamp}-${safeFileName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await CloudStorage.uploadFile(storageKey, buffer, file.type)

    const [metadata] = await sql`
      INSERT INTO uploaded_files (owner_id, project_id, storage_key, mime_type, size_bytes, is_public)
      VALUES (${session.user.id}, ${projectId}, ${storageKey}, ${file.type}, ${file.size}, ${privacy === "public"})
      RETURNING id, owner_id, project_id, storage_key, mime_type, size_bytes, is_public, created_at
    `

    const expiresIn = privacy === "public" ? PUBLIC_URL_TTL_SECONDS : PRIVATE_URL_TTL_SECONDS
    const accessUrl = await CloudStorage.getSignedDownloadUrl(storageKey, expiresIn)

    return NextResponse.json({
      file: {
        id: metadata.id,
        ownerId: metadata.owner_id,
        projectId: metadata.project_id,
        storageKey: metadata.storage_key,
        mimeType: metadata.mime_type,
        size: metadata.size_bytes,
        privacy: metadata.is_public ? "public" : "private",
        createdAt: metadata.created_at,
      },
      access: {
        url: accessUrl,
        expiresIn,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
