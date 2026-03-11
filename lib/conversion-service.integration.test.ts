import assert from "node:assert/strict"
import test from "node:test"

import {
  cancelConversionJob,
  getConversionArtifact,
  getConversionJob,
  processNextConversionJob,
  queueConversionJob,
  retryConversionJob,
  setConversionServiceAdaptersForTests,
  type ConversionWorker,
} from "@/services/conversion-service"
import type { MediaFile } from "@/types/upload"

type Job = any

type Artifact = any

function makeFakeDb() {
  const jobs: Job[] = []
  const artifacts: Artifact[] = []

  const queryMany = async <T = any>(query: string, params: any[] = []): Promise<T[]> => {
    const q = query.toLowerCase().replace(/\s+/g, " ").trim()

    if (q.startsWith("create table") || q.startsWith("create index")) return []

    if (q.includes("insert into conversion_jobs") && q.includes("on conflict (idempotency_key) do nothing")) {
      const [id, fileId, fileName, sourceFormat, targetFormat, settings, idempotencyKey, maxAttempts] = params
      if (!jobs.find((j) => j.idempotency_key === idempotencyKey)) {
        jobs.push({
          id,
          file_id: fileId,
          file_name: fileName,
          source_format: sourceFormat,
          target_format: targetFormat,
          settings: JSON.parse(settings),
          status: "queued",
          progress: 0,
          idempotency_key: idempotencyKey,
          attempts: 0,
          max_attempts: Number(maxAttempts),
          cancellation_requested: false,
          error_code: null,
          error_message: null,
          error_metadata: null,
          output_artifact_id: null,
          output_url: null,
          started_at: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      return []
    }

    if (q.includes("update conversion_jobs set cancellation_requested = true")) {
      const job = jobs.find((j) => j.id === params[0])
      if (job) {
        job.cancellation_requested = true
        if (job.status === "queued") {
          job.status = "cancelled"
          job.completed_at = new Date().toISOString()
        }
      }
      return []
    }

    if (q.includes("update conversion_jobs set status = 'queued'")) {
      const job = jobs.find((j) => j.id === params[0] && j.status === "failed")
      if (job) {
        job.status = "queued"
        job.progress = 0
        job.cancellation_requested = false
        job.error_code = null
        job.error_message = null
        job.error_metadata = null
      }
      return []
    }

    if (q.startsWith("with next_job as")) {
      const job = jobs.find((j) => j.status === "queued")
      if (!job) return []
      job.status = "running"
      job.attempts += 1
      job.started_at = job.started_at ?? new Date().toISOString()
      return [job] as T[]
    }

    if (q.includes("update conversion_jobs set progress =")) {
      const job = jobs.find((j) => j.id === params[0])
      if (job) job.progress = Number(params[1])
      return []
    }

    if (q.includes("insert into conversion_artifacts")) {
      const [id, jobId, storageKey, mimeType, sizeBytes, publicUrl, metadata] = params
      artifacts.push({ id, job_id: jobId, storage_key: storageKey, mime_type: mimeType, size_bytes: sizeBytes, public_url: publicUrl, metadata: JSON.parse(metadata), created_at: new Date().toISOString() })
      return []
    }

    if (q.includes("set status = 'succeeded'") && q.includes("output_artifact_id")) {
      const [jobId, artifactId, url] = params
      const job = jobs.find((j) => j.id === jobId)
      if (job) {
        job.status = "succeeded"
        job.progress = 100
        job.output_artifact_id = artifactId
        job.output_url = url
      }
      return []
    }

    if (q.includes("set status = $2") && q.includes("error_code")) {
      const [jobId, status, errorCode, message, metadata] = params
      const job = jobs.find((j) => j.id === jobId)
      if (job) {
        job.status = status
        job.error_code = errorCode
        job.error_message = message
        job.error_metadata = JSON.parse(metadata)
      }
      return []
    }

    throw new Error(`Unhandled queryMany: ${query}`)
  }

  const queryOne = async <T = any>(query: string, params: any[] = []): Promise<T | null> => {
    const q = query.toLowerCase().replace(/\s+/g, " ").trim()

    if (q.includes("from conversion_jobs where idempotency_key = $1")) {
      return (jobs.find((j) => j.idempotency_key === params[0]) ?? null) as T | null
    }
    if (q.includes("from conversion_jobs where id = $1") && q.includes("select cancellation_requested")) {
      const j = jobs.find((x) => x.id === params[0])
      return (j ? { cancellation_requested: j.cancellation_requested } : null) as T | null
    }
    if (q.includes("from conversion_jobs where id = $1")) {
      return (jobs.find((j) => j.id === params[0]) ?? null) as T | null
    }
    if (q.includes("from conversion_artifacts where job_id = $1")) {
      return (artifacts.find((a) => a.job_id === params[0]) ?? null) as T | null
    }

    throw new Error(`Unhandled queryOne: ${query}`)
  }

  return { queryMany, queryOne }
}

const mediaFile: MediaFile = {
  id: "file-1",
  name: "demo.mp4",
  type: "video",
  size: 1000,
  url: "https://example.test/demo.mp4",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  isPublic: false,
}

test("conversion e2e succeeds and artifact can be retrieved", async () => {
  setConversionServiceAdaptersForTests(makeFakeDb())

  const job = await queueConversionJob({ file: mediaFile, targetFormat: "mp3", settings: { audioCodec: "mp3" }, idempotencyKey: "idem-success" })
  const processed = await processNextConversionJob({
    storage: {
      async putObject() {
        return { fileId: "artifact-1", url: "https://storage.test/artifact-1.mp3" }
      },
    },
  })

  assert.equal(processed.processed, true)
  assert.equal(processed.job?.status, "succeeded")
  assert.equal(job.id, processed.job?.id)

  const artifact = await getConversionArtifact(job.id)
  assert.equal(artifact?.id, "artifact-1")
  assert.equal(artifact?.url, "https://storage.test/artifact-1.mp3")

  setConversionServiceAdaptersForTests(null)
})

test("conversion failure can be retried and then succeeds", async () => {
  setConversionServiceAdaptersForTests(makeFakeDb())

  const job = await queueConversionJob({ file: mediaFile, targetFormat: "wav", settings: {}, idempotencyKey: "idem-retry" })

  const failingWorker: ConversionWorker = async () => {
    throw new Error("worker crashed")
  }
  await processNextConversionJob({ worker: failingWorker })
  const failed = await getConversionJob(job.id)
  assert.equal(failed?.status, "failed")

  const retried = await retryConversionJob(job.id)
  assert.equal(retried?.status, "queued")

  await processNextConversionJob({
    storage: { async putObject() { return { fileId: "artifact-2", url: "https://storage.test/artifact-2.wav" } } },
  })
  const succeeded = await getConversionJob(job.id)
  assert.equal(succeeded?.status, "succeeded")

  setConversionServiceAdaptersForTests(null)
})

test("queued conversion can be cancelled", async () => {
  setConversionServiceAdaptersForTests(makeFakeDb())

  const job = await queueConversionJob({ file: mediaFile, targetFormat: "ogg", settings: {}, idempotencyKey: "idem-cancel" })
  const cancelled = await cancelConversionJob(job.id)
  assert.equal(cancelled?.status, "cancelled")

  const processed = await processNextConversionJob()
  assert.equal(processed.processed, false)

  setConversionServiceAdaptersForTests(null)
})
