import { NextResponse, type NextRequest } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { formatZodIssues, mediaUploadFinalizeRequestSchema } from "@/lib/api/contracts"
import { sql } from "@/lib/db"
import { CloudStorage } from "@/lib/cloud-storage"
import { queueTranscodePipeline } from "@/lib/media/transcode-pipeline"
import { createRequestLogContext, logApiEvent } from "@/lib/api/logging"
import { recordOperationMetric, resolveCorrelationId, withOperationSpan } from "@/lib/operations-observability"

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

export async function POST(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ assetId: string }> }) {
  const params = await routeParamsPromise
  const correlationId = resolveCorrelationId(request)
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const parsedBody = mediaUploadFinalizeRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid body", code: "INVALID_REQUEST", details: { issues: formatZodIssues(parsedBody.error) } },
      { status: 400 },
    )
  }

  const [asset] = await sql`
    SELECT *
    FROM media_assets
    WHERE id=${params.assetId} AND owner_id=${auth.userId}
  `

  if (!asset) {
    return NextResponse.json({ error: "Asset not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const head = await CloudStorage.getObjectMetadata(asset.source_storage_key).catch(() => null)

  const durationSeconds = readNumber(parsedBody.data.durationSeconds)
  const width = readNumber(parsedBody.data.width)
  const height = readNumber(parsedBody.data.height)

  const [updated] = await sql`
    UPDATE media_assets
    SET
      status='uploaded',
      source_etag=COALESCE(${head?.ETag ?? null}, source_etag),
      source_size_bytes=COALESCE(${head?.ContentLength ?? null}, source_size_bytes),
      duration_seconds=COALESCE(${durationSeconds}, duration_seconds),
      width=COALESCE(${width}, width),
      height=COALESCE(${height}, height),
      codec_video=COALESCE(${typeof parsedBody.data.codecVideo === "string" ? parsedBody.data.codecVideo : null}, codec_video),
      codec_audio=COALESCE(${typeof parsedBody.data.codecAudio === "string" ? parsedBody.data.codecAudio : null}, codec_audio),
      frame_rate=COALESCE(${readNumber(parsedBody.data.frameRate)}, frame_rate),
      channels=COALESCE(${readNumber(parsedBody.data.channels)}, channels),
      sample_rate=COALESCE(${readNumber(parsedBody.data.sampleRate)}, sample_rate),
      uploaded_at=now(),
      finalized_at=now(),
      updated_at=now(),
      metadata = metadata || ${JSON.stringify({ finalizeContext: "upload-complete" })}::jsonb
    WHERE id=${params.assetId} AND owner_id=${auth.userId}
    RETURNING *
  `

  await sql`UPDATE media_assets SET status='processing', updated_at=now() WHERE id=${params.assetId} AND owner_id=${auth.userId}`

  const transcode = await withOperationSpan(
    "media.transcode.queue",
    { correlationId, attributes: { assetId: params.assetId, ownerId: auth.userId } },
    async () =>
      queueTranscodePipeline({
    assetId: params.assetId,
    ownerId: auth.userId,
    projectId: updated.project_id,
    kind: updated.kind,
    sourceStorageKey: updated.source_storage_key,
    sourceMimeType: updated.source_mime_type,
    durationSeconds: updated.duration_seconds,
    width: updated.width,
    height: updated.height,
  }),
  )

  recordOperationMetric("ops.media_ingest.success", 1, { assetId: params.assetId })
  logApiEvent("info", "media.upload.finalize.completed", {
    ...createRequestLogContext(request, { userId: String(auth.userId) }),
    details: { assetId: params.assetId, transcodeJobId: transcode.jobId, correlationId },
  })

  const [resultAsset] = await sql`SELECT * FROM media_assets WHERE id=${params.assetId} AND owner_id=${auth.userId}`
  const variants = await sql`SELECT * FROM media_variants WHERE asset_id=${params.assetId} AND owner_id=${auth.userId} ORDER BY created_at`

  return NextResponse.json({
    asset: resultAsset,
    transcode,
    variants,
  })
}
