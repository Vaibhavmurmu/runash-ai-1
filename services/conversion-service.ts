import { queryMany as dbQueryMany, queryOne as dbQueryOne } from "@/lib/db"
import { CloudStorage } from "@/lib/cloud-storage"
import type { ConversionJob, ConversionSettings, MediaFormat } from "@/types/conversion"
import type { MediaFile } from "@/types/upload"

export type PersistedConversionJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"

export type ConversionArtifact = {
  id: string
  jobId: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  url: string
  createdAt: string
}

export type ConversionJobRecord = {
  id: string
  fileId: string
  fileName: string
  sourceFormat: string
  targetFormat: string
  settings: ConversionSettings
  status: PersistedConversionJobStatus
  progress: number
  idempotencyKey: string
  attempts: number
  maxAttempts: number
  errorCode?: string
  errorMessage?: string
  errorMetadata?: Record<string, unknown>
  outputArtifactId?: string
  outputUrl?: string
  cancellationRequested: boolean
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

export type ConversionWorkerInput = {
  job: ConversionJobRecord
  updateProgress: (progress: number) => Promise<void>
  isCancellationRequested: () => Promise<boolean>
}

export type ConversionWorkerResult = {
  buffer: Buffer
  mimeType: string
  extension: string
  metadata?: Record<string, unknown>
}

export type ConversionWorker = (input: ConversionWorkerInput) => Promise<ConversionWorkerResult>

export interface ConversionStorage {
  putObject: (params: { key: string; buffer: Buffer; contentType: string }) => Promise<{ fileId: string; url: string }>
}



type ConversionDbAdapters = {
  queryMany: typeof dbQueryMany
  queryOne: typeof dbQueryOne
}

let adapters: ConversionDbAdapters = {
  queryMany: dbQueryMany,
  queryOne: dbQueryOne,
}

export function setConversionServiceAdaptersForTests(next: ConversionDbAdapters | null) {
  adapters = next ?? { queryMany: dbQueryMany, queryOne: dbQueryOne }
  tablesInitialized = false
}

type QueueConversionInput = {
  file: MediaFile
  targetFormat: string
  settings: ConversionSettings
  idempotencyKey?: string
  maxAttempts?: number
}

// Available formats for conversion
export const availableFormats: MediaFormat[] = [
  {
    id: "mp4",
    name: "MP4",
    extension: ".mp4",
    mimeType: "video/mp4",
    category: "video",
    description: "Most compatible video format for web and mobile",
  },
  {
    id: "webm",
    name: "WebM",
    extension: ".webm",
    mimeType: "video/webm",
    category: "video",
    description: "Optimized for web streaming with better compression",
  },
  {
    id: "mov",
    name: "QuickTime",
    extension: ".mov",
    mimeType: "video/quicktime",
    category: "video",
    description: "Apple QuickTime format with high quality",
  },
  {
    id: "avi",
    name: "AVI",
    extension: ".avi",
    mimeType: "video/x-msvideo",
    category: "video",
    description: "Classic video format with wide compatibility",
  },
  {
    id: "mkv",
    name: "MKV",
    extension: ".mkv",
    mimeType: "video/x-matroska",
    category: "video",
    description: "Container format that can hold multiple audio/video tracks",
  },
  {
    id: "mp3",
    name: "MP3",
    extension: ".mp3",
    mimeType: "audio/mpeg",
    category: "audio",
    description: "Standard compressed audio format with good quality",
  },
  {
    id: "wav",
    name: "WAV",
    extension: ".wav",
    mimeType: "audio/wav",
    category: "audio",
    description: "Uncompressed audio format with highest quality",
  },
  {
    id: "aac",
    name: "AAC",
    extension: ".aac",
    mimeType: "audio/aac",
    category: "audio",
    description: "Advanced audio coding with better compression than MP3",
  },
  {
    id: "ogg",
    name: "OGG",
    extension: ".ogg",
    mimeType: "audio/ogg",
    category: "audio",
    description: "Free, open container format for audio",
  },
  {
    id: "flac",
    name: "FLAC",
    extension: ".flac",
    mimeType: "audio/flac",
    category: "audio",
    description: "Lossless audio compression format",
  },
]

// Conversion presets
export const conversionPresets = [
  {
    id: "web-optimized",
    name: "Web Optimized",
    description: "Optimized for web streaming with good quality and file size balance",
    targetFormat: "mp4",
    settings: {
      resolution: { width: 1280, height: 720 },
      videoBitrate: 2500,
      framerate: 30,
      videoCodec: "h264",
      audioBitrate: 128,
      audioCodec: "aac",
      sampleRate: 44100,
      channels: 2,
      quality: 80,
      preserveMetadata: true,
    },
  },
  {
    id: "high-quality",
    name: "High Quality",
    description: "Maximum quality with larger file size",
    targetFormat: "mp4",
    settings: {
      resolution: { width: 1920, height: 1080 },
      videoBitrate: 8000,
      framerate: 60,
      videoCodec: "h264",
      audioBitrate: 320,
      audioCodec: "aac",
      sampleRate: 48000,
      channels: 2,
      quality: 95,
      preserveMetadata: true,
    },
  },
  {
    id: "mobile-friendly",
    name: "Mobile Friendly",
    description: "Optimized for mobile devices with smaller file size",
    targetFormat: "mp4",
    settings: {
      resolution: { width: 854, height: 480 },
      videoBitrate: 1200,
      framerate: 30,
      videoCodec: "h264",
      audioBitrate: 96,
      audioCodec: "aac",
      sampleRate: 44100,
      channels: 2,
      quality: 70,
      preserveMetadata: true,
    },
  },
  {
    id: "audio-only",
    name: "Audio Only",
    description: "Extract audio track from video",
    targetFormat: "mp3",
    settings: {
      audioBitrate: 192,
      audioCodec: "mp3",
      sampleRate: 44100,
      channels: 2,
      quality: 85,
      preserveMetadata: true,
      stripVideo: true,
    },
  },
  {
    id: "high-quality-audio",
    name: "High Quality Audio",
    description: "Maximum audio quality",
    targetFormat: "flac",
    settings: {
      audioBitrate: 1411,
      audioCodec: "flac",
      sampleRate: 48000,
      channels: 2,
      quality: 100,
      preserveMetadata: true,
    },
  },
]

function createId(prefix: string): string {
  const fromCrypto = typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${fromCrypto}`
}

let tablesInitialized = false

export async function ensureConversionTables() {
  if (tablesInitialized) return

  await adapters.queryMany(`
    CREATE TABLE IF NOT EXISTS conversion_jobs (
      id uuid PRIMARY KEY,
      file_id text NOT NULL,
      file_name text NOT NULL,
      source_format text NOT NULL,
      target_format text NOT NULL,
      settings jsonb NOT NULL DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'queued',
      progress integer NOT NULL DEFAULT 0,
      idempotency_key text NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      max_attempts integer NOT NULL DEFAULT 3,
      cancellation_requested boolean NOT NULL DEFAULT false,
      error_code text,
      error_message text,
      error_metadata jsonb,
      output_artifact_id uuid,
      output_url text,
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (idempotency_key)
    )
  `)

  await adapters.queryMany(`
    CREATE TABLE IF NOT EXISTS conversion_artifacts (
      id uuid PRIMARY KEY,
      job_id uuid NOT NULL REFERENCES conversion_jobs(id) ON DELETE CASCADE,
      storage_key text NOT NULL,
      mime_type text NOT NULL,
      size_bytes bigint NOT NULL,
      public_url text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)

  await adapters.queryMany(`CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status ON conversion_jobs(status, created_at DESC)`)
  await adapters.queryMany(`CREATE INDEX IF NOT EXISTS idx_conversion_artifacts_job_id ON conversion_artifacts(job_id)`)

  tablesInitialized = true
}

const defaultStorage: ConversionStorage = {
  async putObject({ key, buffer, contentType }) {
    const url = await CloudStorage.uploadFile(key, buffer, contentType)
    return { fileId: createId("artifact"), url }
  },
}

const defaultWorker: ConversionWorker = async ({ job, updateProgress, isCancellationRequested }) => {
  const extension = getFormatFromExtension(`.${job.targetFormat}`)?.extension ?? `.${job.targetFormat}`
  const mimeType = availableFormats.find((f) => f.id === job.targetFormat)?.mimeType ?? "application/octet-stream"

  await updateProgress(10)
  if (await isCancellationRequested()) {
    throw new Error("Conversion cancelled")
  }

  await updateProgress(55)
  await new Promise((resolve) => setTimeout(resolve, 5))
  if (await isCancellationRequested()) {
    throw new Error("Conversion cancelled")
  }

  const output = {
    jobId: job.id,
    sourceFileId: job.fileId,
    targetFormat: job.targetFormat,
    generatedAt: new Date().toISOString(),
    settings: job.settings,
  }

  await updateProgress(90)
  return {
    buffer: Buffer.from(JSON.stringify(output), "utf8"),
    mimeType,
    extension,
  }
}

function mapRowToJobRecord(row: any): ConversionJobRecord {
  return {
    id: String(row.id),
    fileId: String(row.file_id),
    fileName: String(row.file_name),
    sourceFormat: String(row.source_format),
    targetFormat: String(row.target_format),
    settings: (row.settings ?? {}) as ConversionSettings,
    status: String(row.status) as PersistedConversionJobStatus,
    progress: Number(row.progress ?? 0),
    idempotencyKey: String(row.idempotency_key),
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    errorCode: row.error_code ? String(row.error_code) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    errorMetadata: row.error_metadata ?? undefined,
    outputArtifactId: row.output_artifact_id ? String(row.output_artifact_id) : undefined,
    outputUrl: row.output_url ? String(row.output_url) : undefined,
    cancellationRequested: Boolean(row.cancellation_requested),
    createdAt: new Date(String(row.created_at)).toISOString(),
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : undefined,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

export async function queueConversionJob(input: QueueConversionInput): Promise<ConversionJobRecord> {
  await ensureConversionTables()

  const idempotencyKey = input.idempotencyKey?.trim() || `${input.file.id}:${input.targetFormat}:${JSON.stringify(input.settings)}`

  const existing = await adapters.queryOne<any>(`SELECT * FROM conversion_jobs WHERE idempotency_key = $1`, [idempotencyKey])
  if (existing) {
    return mapRowToJobRecord(existing)
  }

  const jobId = createId("job")

  await adapters.queryMany(
    `INSERT INTO conversion_jobs (
      id, file_id, file_name, source_format, target_format, settings, status, progress, idempotency_key, max_attempts
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'queued', 0, $7, $8)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [jobId, input.file.id, input.file.name, input.file.type, input.targetFormat, JSON.stringify(input.settings ?? {}), idempotencyKey, input.maxAttempts ?? 3],
  )

  const inserted = await adapters.queryOne<any>(`SELECT * FROM conversion_jobs WHERE idempotency_key = $1`, [idempotencyKey])
  if (!inserted) {
    throw new Error("Unable to enqueue conversion job")
  }

  return mapRowToJobRecord(inserted)
}

export async function getConversionJob(jobId: string): Promise<ConversionJobRecord | null> {
  await ensureConversionTables()
  const row = await adapters.queryOne<any>(`SELECT * FROM conversion_jobs WHERE id = $1`, [jobId])
  return row ? mapRowToJobRecord(row) : null
}

export async function cancelConversionJob(jobId: string): Promise<ConversionJobRecord | null> {
  await ensureConversionTables()
  await adapters.queryMany(
    `UPDATE conversion_jobs
     SET cancellation_requested = true,
         status = CASE WHEN status = 'queued' THEN 'cancelled' ELSE status END,
         completed_at = CASE WHEN status = 'queued' THEN NOW() ELSE completed_at END,
         updated_at = NOW()
     WHERE id = $1`,
    [jobId],
  )

  return getConversionJob(jobId)
}

export async function retryConversionJob(jobId: string): Promise<ConversionJobRecord | null> {
  await ensureConversionTables()
  await adapters.queryMany(
    `UPDATE conversion_jobs
     SET status = 'queued',
         progress = 0,
         cancellation_requested = false,
         error_code = NULL,
         error_message = NULL,
         error_metadata = NULL,
         started_at = NULL,
         completed_at = NULL,
         updated_at = NOW()
     WHERE id = $1 AND status = 'failed'`,
    [jobId],
  )

  return getConversionJob(jobId)
}

export async function getConversionArtifact(jobId: string): Promise<ConversionArtifact | null> {
  await ensureConversionTables()
  const row = await adapters.queryOne<any>(`SELECT * FROM conversion_artifacts WHERE job_id = $1 ORDER BY created_at DESC LIMIT 1`, [jobId])
  if (!row) return null

  return {
    id: String(row.id),
    jobId: String(row.job_id),
    storageKey: String(row.storage_key),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    url: String(row.public_url),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

export async function processNextConversionJob(options?: {
  storage?: ConversionStorage
  worker?: ConversionWorker
}): Promise<{ processed: boolean; job?: ConversionJobRecord }> {
  await ensureConversionTables()
  const storage = options?.storage ?? defaultStorage
  const worker = options?.worker ?? defaultWorker

  const [claimed] = await adapters.queryMany<any>(
    `WITH next_job AS (
      SELECT id
      FROM conversion_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE conversion_jobs c
    SET status = 'running',
        started_at = COALESCE(c.started_at, NOW()),
        attempts = c.attempts + 1,
        updated_at = NOW()
    FROM next_job
    WHERE c.id = next_job.id
    RETURNING c.*`,
  )

  if (!claimed) {
    return { processed: false }
  }

  const job = mapRowToJobRecord(claimed)

  const updateProgress = async (progress: number) => {
    await adapters.queryMany(`UPDATE conversion_jobs SET progress = $2, updated_at = NOW() WHERE id = $1`, [job.id, Math.max(0, Math.min(100, Math.round(progress)))])
  }

  const isCancellationRequested = async () => {
    const current = await adapters.queryOne<any>(`SELECT cancellation_requested FROM conversion_jobs WHERE id = $1`, [job.id])
    return Boolean(current?.cancellation_requested)
  }

  try {
    if (await isCancellationRequested()) {
      throw new Error("Conversion cancelled")
    }

    const result = await worker({
      job,
      updateProgress,
      isCancellationRequested,
    })

    const storageKey = `conversion/jobs/${job.id}/output${result.extension}`
    const uploaded = await storage.putObject({ key: storageKey, buffer: result.buffer, contentType: result.mimeType })
    const artifactId = uploaded.fileId || createId("artifact")

    await adapters.queryMany(
      `INSERT INTO conversion_artifacts (id, job_id, storage_key, mime_type, size_bytes, public_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [artifactId, job.id, storageKey, result.mimeType, result.buffer.length, uploaded.url, JSON.stringify(result.metadata ?? {})],
    )

    await adapters.queryMany(
      `UPDATE conversion_jobs
       SET status = 'succeeded',
           progress = 100,
           output_artifact_id = $2,
           output_url = $3,
           completed_at = NOW(),
           error_code = NULL,
           error_message = NULL,
           error_metadata = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [job.id, artifactId, uploaded.url],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversion failure"
    const errorCode = message === "Conversion cancelled" ? "cancelled" : "processing_error"

    await adapters.queryMany(
      `UPDATE conversion_jobs
       SET status = $2,
           completed_at = NOW(),
           error_code = $3,
           error_message = $4,
           error_metadata = $5::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [
        job.id,
        errorCode === "cancelled" ? "cancelled" : "failed",
        errorCode,
        message,
        JSON.stringify({ attempt: job.attempts + 1, maxAttempts: job.maxAttempts }),
      ],
    )
  }

  const persisted = await getConversionJob(job.id)
  return { processed: true, job: persisted ?? undefined }
}

// Backward-compatible callback API built on durable queue + processor orchestration.
export const startConversion = (
  job: ConversionJob,
  onProgress: (progress: number) => void,
  onComplete: (outputFileId: string) => void,
  onError: (error: string) => void,
) => {
  let cancelled = false
  const idempotencyKey = job.id

  const run = async () => {
    try {
      const queued = await queueConversionJob({
        file: {
          id: job.fileId,
          name: job.fileName,
          type: job.sourceFormat as MediaFile["type"],
          size: 0,
          url: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isPublic: false,
        },
        targetFormat: job.targetFormat,
        settings: job.settings,
        idempotencyKey,
      })

      if (cancelled) {
        await cancelConversionJob(queued.id)
        return
      }

      await processNextConversionJob({
        worker: async ({ updateProgress, isCancellationRequested }) => {
          await updateProgress(20)
          onProgress(20)
          await updateProgress(65)
          onProgress(65)
          if (await isCancellationRequested()) {
            throw new Error("Conversion cancelled")
          }
          await updateProgress(95)
          onProgress(95)
          return defaultWorker({ job: queued, updateProgress, isCancellationRequested })
        },
      })

      const refreshed = await getConversionJob(queued.id)
      if (!refreshed) {
        onError("Conversion job not found after processing")
        return
      }

      if (refreshed.status === "succeeded" && refreshed.outputArtifactId) {
        onProgress(100)
        onComplete(refreshed.outputArtifactId)
        return
      }

      onError(refreshed.errorMessage || "Conversion failed")
    } catch (error) {
      onError(error instanceof Error ? error.message : "Conversion failed")
    }
  }

  void run()

  return () => {
    cancelled = true
    void cancelConversionJob(job.id)
  }
}

// Get compatible target formats for a given file
export const getCompatibleFormats = (file: MediaFile): MediaFormat[] => {
  if (file.type === "video") {
    return availableFormats.filter((format) => format.category === "video" || format.category === "audio")
  }
  if (file.type === "audio") {
    return availableFormats.filter((format) => format.category === "audio")
  }
  if (file.type === "image") {
    return availableFormats.filter((format) => format.category === "image")
  }

  return []
}

// Get file extension from mime type
export const getExtensionFromMimeType = (mimeType: string): string => {
  const format = availableFormats.find((f) => f.mimeType === mimeType)
  return format?.extension || ""
}

// Get format from extension
export const getFormatFromExtension = (extension: string): MediaFormat | undefined => {
  return availableFormats.find((f) => f.extension === extension)
}

// Create a new conversion job
export const createConversionJob = (
  file: MediaFile,
  targetFormat: string,
  settings: ConversionSettings,
): ConversionJob => {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    fileId: file.id,
    fileName: file.name,
    sourceFormat: file.type,
    targetFormat,
    settings,
    status: "queued",
    progress: 0,
    startTime: new Date().toISOString(),
  }
}

// Estimate output file size based on settings and input file
export const estimateOutputSize = (
  inputSize: number,
  sourceFormat: string,
  targetFormat: string,
  settings: ConversionSettings,
): number => {
  let compressionFactor = 1.0

  if (targetFormat === "mp4") compressionFactor = 0.8
  else if (targetFormat === "webm") compressionFactor = 0.6
  else if (targetFormat === "mov") compressionFactor = 1.2
  else if (targetFormat === "avi") compressionFactor = 1.5
  else if (targetFormat === "mp3") compressionFactor = 0.1
  else if (targetFormat === "aac") compressionFactor = 0.08
  else if (targetFormat === "ogg") compressionFactor = 0.09
  else if (targetFormat === "flac") compressionFactor = 0.5
  else if (targetFormat === "wav") compressionFactor = 0.7

  if (settings.quality) {
    compressionFactor *= settings.quality / 80
  }

  if (settings.resolution && sourceFormat === "video") {
    const resolutionFactor = (settings.resolution.width * settings.resolution.height) / (1280 * 720)
    compressionFactor *= resolutionFactor
  }

  if (settings.videoBitrate && sourceFormat === "video") {
    compressionFactor *= settings.videoBitrate / 2500
  }

  if (sourceFormat === "video" && settings.stripVideo) {
    compressionFactor = 0.1
  }

  return Math.round(inputSize * compressionFactor)
}
