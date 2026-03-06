import type { EditorRenderJob, EditorRenderStatus } from "@/lib/editor/domain"
import { publishRenderJobUpdated } from "@/services/realtime/publishers"

type RenderJobListener = (event: RenderJobEvent) => void

export interface RenderJobEvent {
  job: EditorRenderJob
  scope: {
    ownerId: string
    projectId: string
    jobId: string
  }
  transition: {
    status: EditorRenderStatus
    progress: number | null
    stage: string | null
    updatedAt: string
  }
}

const jobListeners = new Map<string, Set<RenderJobListener>>()
const userListeners = new Map<string, Set<RenderJobListener>>()

function getProgress(result: Record<string, unknown>): number | null {
  const value = result.progress
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getStage(result: Record<string, unknown>): string | null {
  const value = result.stage
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function key(ownerId: string, jobId: string) {
  return `${ownerId}:${jobId}`
}

export function publishRenderJobEvent(job: EditorRenderJob) {
  const event: RenderJobEvent = {
    job,
    scope: {
      ownerId: job.ownerId,
      projectId: job.projectId,
      jobId: job.id,
    },
    transition: {
      status: job.status,
      progress: getProgress(job.result),
      stage: getStage(job.result),
      updatedAt: job.updatedAt,
    },
  }

  publishRenderJobUpdated({
    projectId: job.projectId,
    jobId: job.id,
    status: job.status,
    progress: event.transition.progress,
    stage: event.transition.stage,
    updatedAt: event.transition.updatedAt,
  })

  const byJob = jobListeners.get(key(job.ownerId, job.id))
  byJob?.forEach((listener) => listener(event))

  const byUser = userListeners.get(job.ownerId)
  byUser?.forEach((listener) => listener(event))
}

export function subscribeRenderJobEvents(
  ownerId: string,
  options: { jobId?: string; onEvent: RenderJobListener },
): () => void {
  const listeners = options.jobId
    ? jobListeners.get(key(ownerId, options.jobId)) ?? new Set<RenderJobListener>()
    : userListeners.get(ownerId) ?? new Set<RenderJobListener>()

  listeners.add(options.onEvent)

  if (options.jobId) {
    jobListeners.set(key(ownerId, options.jobId), listeners)
  } else {
    userListeners.set(ownerId, listeners)
  }

  return () => {
    listeners.delete(options.onEvent)
    if (listeners.size > 0) return

    if (options.jobId) {
      jobListeners.delete(key(ownerId, options.jobId))
    } else {
      userListeners.delete(ownerId)
    }
  }
}

