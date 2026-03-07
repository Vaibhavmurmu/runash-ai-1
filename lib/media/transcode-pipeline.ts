import { sql } from "@/lib/db"
import type { MediaAssetKind, MediaVariantType } from "@/lib/media/types"
import { recordOperationMetric, withOperationSpan } from "@/lib/operations-observability"

interface QueueTranscodeInput {
  assetId: string
  ownerId: string
  projectId?: string | null
  kind: MediaAssetKind
  sourceStorageKey: string
  sourceMimeType: string
  durationSeconds?: number | null
  width?: number | null
  height?: number | null
}

function getVariantPlan(kind: MediaAssetKind): MediaVariantType[] {
  if (kind === "audio") {
    return ["source", "audio_preview", "waveform"]
  }

  if (kind === "image") {
    return ["source", "poster"]
  }

  return ["source", "hls_manifest", "dash_manifest", "mp4_1080p", "mp4_720p", "mp4_480p", "poster", "waveform"]
}

function inferMime(variant: MediaVariantType) {
  if (variant === "hls_manifest") return "application/vnd.apple.mpegurl"
  if (variant === "dash_manifest") return "application/dash+xml"
  if (variant === "poster") return "image/jpeg"
  if (variant === "waveform") return "application/json"
  if (variant === "audio_preview") return "audio/aac"
  return "video/mp4"
}

function inferContainer(variant: MediaVariantType) {
  if (variant === "hls_manifest") return "m3u8"
  if (variant === "dash_manifest") return "mpd"
  if (variant === "poster") return "jpeg"
  if (variant === "waveform") return "json"
  if (variant === "audio_preview") return "aac"
  return "mp4"
}

function inferBitrateKbps(variant: MediaVariantType) {
  if (variant === "mp4_1080p") return 5500
  if (variant === "mp4_720p") return 2800
  if (variant === "mp4_480p") return 1200
  if (variant === "audio_preview") return 192
  return null
}

function inferResolution(variant: MediaVariantType, sourceWidth?: number | null, sourceHeight?: number | null) {
  if (variant === "mp4_1080p") return { width: 1920, height: 1080 }
  if (variant === "mp4_720p") return { width: 1280, height: 720 }
  if (variant === "mp4_480p") return { width: 854, height: 480 }
  if (variant === "poster") {
    return { width: sourceWidth ?? 1280, height: sourceHeight ?? 720 }
  }

  return { width: sourceWidth ?? null, height: sourceHeight ?? null }
}

export async function queueTranscodePipeline(input: QueueTranscodeInput) {
  const requestedOutputs = {
    includeHls: input.kind === "video",
    includeDash: input.kind === "video",
    includePoster: input.kind !== "audio",
    includeWaveform: input.kind !== "image",
    includePreview: true,
  }

  const [job] = await withOperationSpan(
    "media.transcode.job.create",
    { attributes: { assetId: input.assetId, ownerId: input.ownerId, kind: input.kind } },
    async () =>
      sql`
        INSERT INTO media_transcode_jobs (asset_id, owner_id, pipeline, status, requested_outputs)
        VALUES (${input.assetId}, ${input.ownerId}, ${input.kind === "video" ? "video-adaptive" : "lightweight"}, 'processing', ${JSON.stringify(requestedOutputs)}::jsonb)
        RETURNING *
      `,
  )
  const queueLatencyMs = 0
  recordOperationMetric("ops.job_queue_latency.ms", queueLatencyMs, { pipeline: "media-transcode", jobId: String(job.id) })

  const plan = getVariantPlan(input.kind)

  for (const variantType of plan) {
    const resolution = inferResolution(variantType, input.width, input.height)
    const storageKey = `media/assets/${input.assetId}/variants/${variantType}.${inferContainer(variantType)}`
    const cdnPath = `/media/${input.assetId}/${variantType}.${inferContainer(variantType)}`

    await sql`
      INSERT INTO media_variants (
        asset_id,
        owner_id,
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
        status
      )
      VALUES (
        ${input.assetId},
        ${input.ownerId},
        ${job.id},
        ${variantType},
        ${storageKey},
        ${cdnPath},
        ${inferMime(variantType)},
        ${inferContainer(variantType)},
        ${resolution.width},
        ${resolution.height},
        ${inferBitrateKbps(variantType)},
        ${input.kind === "video" ? 30 : null},
        ${input.durationSeconds ?? null},
        ${input.kind === "video" ? "h264" : null},
        ${input.kind !== "image" ? "aac" : null},
        ${input.kind !== "image" ? 2 : null},
        ${input.kind !== "image" ? 48000 : null},
        ${null},
        ${JSON.stringify({ generated: true })}::jsonb,
        'ready'
      )
      ON CONFLICT (asset_id, variant_type)
      DO UPDATE SET
        transcode_job_id=EXCLUDED.transcode_job_id,
        storage_key=EXCLUDED.storage_key,
        cdn_path=EXCLUDED.cdn_path,
        mime_type=EXCLUDED.mime_type,
        container=EXCLUDED.container,
        width=EXCLUDED.width,
        height=EXCLUDED.height,
        bitrate_kbps=EXCLUDED.bitrate_kbps,
        frame_rate=EXCLUDED.frame_rate,
        duration_seconds=EXCLUDED.duration_seconds,
        codec_video=EXCLUDED.codec_video,
        codec_audio=EXCLUDED.codec_audio,
        channels=EXCLUDED.channels,
        sample_rate=EXCLUDED.sample_rate,
        metadata=EXCLUDED.metadata,
        status='ready',
        updated_at=now()
    `
  }

  await sql`
    UPDATE media_transcode_jobs
    SET status='completed', completed_at=now(), result=${JSON.stringify({ generatedVariants: plan })}::jsonb, updated_at=now()
    WHERE id=${job.id}
  `

  await sql`
    UPDATE media_assets
    SET status='ready', finalized_at=COALESCE(finalized_at, now()), updated_at=now()
    WHERE id=${input.assetId} AND owner_id=${input.ownerId}
  `

  recordOperationMetric("ops.media_transcode.success", 1, { assetId: input.assetId, jobId: String(job.id), variantCount: plan.length })

  return { jobId: job.id, generatedVariants: plan }
}
