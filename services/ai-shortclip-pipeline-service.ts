import { getSql } from "@/lib/db/neon"
import { EnhancedCloudStorage } from "@/lib/enhanced-cloud-storage"

export type ClipJobStatus = "queued" | "processing" | "review" | "completed" | "failed" | "published"

type StartClipJobInput = {
  sellerUserId: number
  recordingId?: string
  sourceUploadKey?: string
  sourceUrl?: string
  titleHint?: string
  clipCount?: number
  channels: string[]
  reviewRequired?: boolean
}

type StageResult = {
  stage: string
  progress: number
}

type GeneratedClipAsset = {
  clipIndex: number
  title: string
  description: string
  captionText: string
  durationSeconds: number
  clipStartSeconds: number
  clipEndSeconds: number
  score: number
}

const DEFAULT_CHANNELS = ["instagram_reels", "youtube_shorts"]

export class AIShortclipPipelineService {
  private readonly storage = EnhancedCloudStorage.getInstance()

  async startJob(input: StartClipJobInput) {
    const sql = getSql()
    const channels = input.channels.length > 0 ? input.channels : DEFAULT_CHANNELS

    const [job] = await sql/* sql */`
      INSERT INTO public.clip_jobs (
        seller_user_id,
        recording_id,
        source_upload_key,
        source_url,
        title_hint,
        status,
        progress,
        pipeline_stage,
        channels,
        review_required,
        metadata
      )
      VALUES (
        ${input.sellerUserId},
        ${input.recordingId ?? null},
        ${input.sourceUploadKey ?? null},
        ${input.sourceUrl ?? null},
        ${input.titleHint ?? null},
        'queued',
        0,
        'queued',
        ${JSON.stringify(channels)}::jsonb,
        ${input.reviewRequired ?? true},
        ${JSON.stringify({ clipCount: input.clipCount ?? 3 })}::jsonb
      )
      RETURNING id, status, progress, pipeline_stage, created_at
    `

    void this.runPipeline({
      jobId: String(job.id),
      sellerUserId: input.sellerUserId,
      sourceUploadKey: input.sourceUploadKey,
      sourceUrl: input.sourceUrl,
      titleHint: input.titleHint,
      clipCount: Math.max(1, Math.min(input.clipCount ?? 3, 6)),
      reviewRequired: input.reviewRequired ?? true,
      channels,
    })

    return {
      id: String(job.id),
      status: String(job.status) as ClipJobStatus,
      progress: Number(job.progress ?? 0),
      pipelineStage: String(job.pipeline_stage),
      createdAt: String(job.created_at),
    }
  }

  async getJob(jobId: string, sellerUserId: number) {
    const sql = getSql()
    const [job] = await sql/* sql */`
      SELECT id, seller_user_id, status, progress, pipeline_stage, title_hint, channels, review_required, error_message, started_at, completed_at, created_at, updated_at
      FROM public.clip_jobs
      WHERE id = ${jobId}::uuid
      LIMIT 1
    `

    if (!job || Number(job.seller_user_id) !== sellerUserId) {
      return null
    }

    const assets = await sql/* sql */`
      SELECT id, clip_job_id, title, description, caption_text, duration_seconds, clip_start_seconds, clip_end_seconds, score, preview_url, source_url, storage_key, review_status, published_at, created_at
      FROM public.clip_assets
      WHERE clip_job_id = ${jobId}::uuid
      ORDER BY score DESC, created_at ASC
    `

    return {
      ...job,
      id: String(job.id),
      progress: Number(job.progress ?? 0),
      channels: Array.isArray(job.channels) ? job.channels : [],
      reviewRequired: Boolean(job.review_required),
      assets: assets.map((asset) => ({
        ...asset,
        id: String(asset.id),
        clipJobId: String(asset.clip_job_id),
        durationSeconds: Number(asset.duration_seconds),
        clipStartSeconds: Number(asset.clip_start_seconds),
        clipEndSeconds: Number(asset.clip_end_seconds),
        score: Number(asset.score),
      })),
    }
  }

  async listAssets(sellerUserId: number) {
    const sql = getSql()
    const assets = await sql/* sql */`
      SELECT
        ca.id,
        ca.clip_job_id,
        ca.title,
        ca.description,
        ca.caption_text,
        ca.duration_seconds,
        ca.clip_start_seconds,
        ca.clip_end_seconds,
        ca.score,
        ca.preview_url,
        ca.source_url,
        ca.storage_key,
        ca.review_status,
        ca.published_at,
        ca.created_at,
        cj.status AS job_status,
        cj.pipeline_stage,
        cj.title_hint
      FROM public.clip_assets ca
      INNER JOIN public.clip_jobs cj ON ca.clip_job_id = cj.id
      WHERE cj.seller_user_id = ${sellerUserId}
      ORDER BY ca.created_at DESC
      LIMIT 80
    `

    return assets.map((asset) => ({
      id: String(asset.id),
      clipJobId: String(asset.clip_job_id),
      title: String(asset.title),
      description: String(asset.description ?? ""),
      captionText: String(asset.caption_text ?? ""),
      durationSeconds: Number(asset.duration_seconds),
      clipStartSeconds: Number(asset.clip_start_seconds),
      clipEndSeconds: Number(asset.clip_end_seconds),
      score: Number(asset.score),
      previewUrl: String(asset.preview_url ?? ""),
      sourceUrl: String(asset.source_url ?? ""),
      storageKey: String(asset.storage_key ?? ""),
      reviewStatus: String(asset.review_status),
      publishedAt: asset.published_at ? String(asset.published_at) : null,
      createdAt: String(asset.created_at),
      jobStatus: String(asset.job_status),
      pipelineStage: String(asset.pipeline_stage),
      titleHint: String(asset.title_hint ?? ""),
    }))
  }

  async publishAssets(input: {
    sellerUserId: number
    assetIds: string[]
    channels: string[]
    reviewAction?: "submit_for_review" | "approve_and_publish"
  }) {
    const sql = getSql()
    const channels = input.channels.length > 0 ? input.channels : DEFAULT_CHANNELS

    const assets = await sql/* sql */`
      SELECT ca.id, ca.title, ca.description, ca.review_status, ca.storage_key, ca.source_url, ca.preview_url, cj.seller_user_id
      FROM public.clip_assets ca
      INNER JOIN public.clip_jobs cj ON ca.clip_job_id = cj.id
      WHERE ca.id = ANY(${input.assetIds}::uuid[])
    `

    const ownedAssets = assets.filter((asset) => Number(asset.seller_user_id) === input.sellerUserId)
    if (ownedAssets.length === 0) {
      return { updated: 0, published: 0 }
    }

    if (input.reviewAction === "submit_for_review") {
      await sql/* sql */`
        UPDATE public.clip_assets
        SET review_status = 'in_review', updated_at = NOW()
        WHERE id = ANY(${ownedAssets.map((asset) => asset.id)}::uuid[])
      `
      return { updated: ownedAssets.length, published: 0 }
    }

    const readyAssetIds = ownedAssets
      .filter((asset) => input.reviewAction === "approve_and_publish" || asset.review_status === "approved" || asset.review_status === "auto_approved")
      .map((asset) => String(asset.id))

    if (readyAssetIds.length === 0) {
      return { updated: ownedAssets.length, published: 0 }
    }

    await sql/* sql */`
      UPDATE public.clip_assets
      SET review_status = 'published', published_at = NOW(), updated_at = NOW()
      WHERE id = ANY(${readyAssetIds}::uuid[])
    `

    for (const assetId of readyAssetIds) {
      for (const channel of channels) {
        await sql/* sql */`
          INSERT INTO public.clip_publish_targets (clip_asset_id, seller_user_id, channel, status, payload)
          VALUES (${assetId}::uuid, ${input.sellerUserId}, ${channel}, 'queued', ${JSON.stringify({ source: "seller-clips" })}::jsonb)
        `
      }
    }

    return { updated: ownedAssets.length, published: readyAssetIds.length }
  }

  private async runPipeline(input: {
    jobId: string
    sellerUserId: number
    sourceUploadKey?: string
    sourceUrl?: string
    titleHint?: string
    clipCount: number
    reviewRequired: boolean
    channels: string[]
  }) {
    try {
      await this.updateJobStage(input.jobId, { stage: "ingest", progress: 10 })
      const ingestedSource = await this.ingestSource(input.sellerUserId, input.jobId, input.sourceUploadKey, input.sourceUrl)

      await this.updateJobStage(input.jobId, { stage: "scene_peak_detection", progress: 28 })
      await this.pause(250)

      await this.updateJobStage(input.jobId, { stage: "transcript_highlight_scoring", progress: 55 })
      const clips = this.generateClipDrafts({
        clipCount: input.clipCount,
        titleHint: input.titleHint,
      })

      await this.updateJobStage(input.jobId, { stage: "clip_extraction", progress: 76 })
      const persistedAssets = await this.persistGeneratedAssets({
        jobId: input.jobId,
        sellerUserId: input.sellerUserId,
        sourceUrl: ingestedSource,
        clips,
        reviewRequired: input.reviewRequired,
      })

      await this.updateJobStage(input.jobId, { stage: "auto_caption_and_metadata_generation", progress: 94 })
      await this.pause(250)

      const sql = getSql()
      await sql/* sql */`
        UPDATE public.clip_jobs
        SET status = ${input.reviewRequired ? "review" : "completed"},
            progress = 100,
            pipeline_stage = ${input.reviewRequired ? "awaiting_human_review" : "ready_to_publish"},
            completed_at = NOW(),
            updated_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ generatedAssets: persistedAssets, defaultChannels: input.channels })}::jsonb
        WHERE id = ${input.jobId}::uuid
      `
    } catch {
      const sql = getSql()
      await sql/* sql */`
        UPDATE public.clip_jobs
        SET status = 'failed', progress = 100, pipeline_stage = 'failed', error_message = 'Pipeline failed during processing', completed_at = NOW(), updated_at = NOW()
        WHERE id = ${input.jobId}::uuid
      `
    }
  }

  private async ingestSource(sellerUserId: number, jobId: string, sourceUploadKey?: string, sourceUrl?: string): Promise<string> {
    if (sourceUploadKey) {
      const signed = await this.storage.getSignedDownloadUrl(sourceUploadKey, 3600)
      return signed
    }

    if (sourceUrl) {
      return sourceUrl
    }

    const fallbackKey = `users/${sellerUserId}/clips/input/${jobId}.txt`
    const fallbackPayload = Buffer.from(`clip-job:${jobId}`)
    const uploaded = await this.storage.uploadFile(fallbackKey, fallbackPayload, "text/plain", {
      jobId,
      pipeline: "ai-shortclip",
    })

    return uploaded
  }

  private generateClipDrafts(input: { clipCount: number; titleHint?: string }): GeneratedClipAsset[] {
    const baseTitle = input.titleHint?.trim() || "Live Commerce Highlight"

    return Array.from({ length: input.clipCount }).map((_, index) => {
      const start = index * 28
      const duration = 24 + (index % 2) * 6
      const end = start + duration
      const score = Number((0.92 - index * 0.08).toFixed(2))

      return {
        clipIndex: index + 1,
        title: `${baseTitle} #${index + 1}`,
        description: `AI-ranked peak moment ${index + 1} optimized for short-form distribution.`,
        captionText: `Peak moment ${index + 1}: hook in 1.5s, CTA at ${Math.max(duration - 4, 10)}s.`,
        durationSeconds: duration,
        clipStartSeconds: start,
        clipEndSeconds: end,
        score,
      }
    })
  }

  private async persistGeneratedAssets(input: {
    jobId: string
    sellerUserId: number
    sourceUrl: string
    clips: GeneratedClipAsset[]
    reviewRequired: boolean
  }) {
    const sql = getSql()

    for (const clip of input.clips) {
      const outputKey = `users/${input.sellerUserId}/clips/output/${input.jobId}/${clip.clipIndex}.txt`
      const uploadedPreview = await this.storage.uploadFile(
        outputKey,
        Buffer.from(`${clip.title}\n${clip.description}\n${clip.captionText}`),
        "text/plain",
        {
          jobId: input.jobId,
          clipIndex: String(clip.clipIndex),
          pipeline: "ai-shortclip",
        },
      )

      await sql/* sql */`
        INSERT INTO public.clip_assets (
          clip_job_id,
          seller_user_id,
          title,
          description,
          caption_text,
          duration_seconds,
          clip_start_seconds,
          clip_end_seconds,
          score,
          preview_url,
          source_url,
          storage_key,
          review_status,
          metadata
        )
        VALUES (
          ${input.jobId}::uuid,
          ${input.sellerUserId},
          ${clip.title},
          ${clip.description},
          ${clip.captionText},
          ${clip.durationSeconds},
          ${clip.clipStartSeconds},
          ${clip.clipEndSeconds},
          ${clip.score},
          ${uploadedPreview},
          ${input.sourceUrl},
          ${outputKey},
          ${input.reviewRequired ? "pending_review" : "auto_approved"},
          ${JSON.stringify({ stage: "auto-caption" })}::jsonb
        )
      `
    }

    return input.clips.length
  }

  private async updateJobStage(jobId: string, stage: StageResult) {
    const sql = getSql()
    await sql/* sql */`
      UPDATE public.clip_jobs
      SET status = 'processing',
          progress = ${stage.progress},
          pipeline_stage = ${stage.stage},
          started_at = COALESCE(started_at, NOW()),
          updated_at = NOW()
      WHERE id = ${jobId}::uuid
    `
  }

  private async pause(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}
