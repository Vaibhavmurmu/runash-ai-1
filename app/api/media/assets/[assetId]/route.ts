import { NextResponse, type NextRequest } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ assetId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const [asset] = await sql`
    SELECT *
    FROM media_assets
    WHERE id=${params.assetId} AND owner_id=${auth.userId}
  `

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  }

  const variants = await sql`
    SELECT
      id,
      asset_id,
      transcode_job_id,
      variant_type,
      storage_key,
      cdn_path,
      mime_type,
      container,
      width,
      height,
      bitrate_kbps,
      frame_rate,
      duration_seconds,
      codec_video,
      codec_audio,
      channels,
      sample_rate,
      size_bytes,
      metadata,
      status,
      created_at,
      updated_at
    FROM media_variants
    WHERE asset_id=${params.assetId} AND owner_id=${auth.userId}
    ORDER BY created_at
  `

  return NextResponse.json({ asset, variants })
}
