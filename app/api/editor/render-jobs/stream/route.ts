import { requireEditorUser } from "@/app/api/editor/_lib"
import { subscribeRenderJobEvents } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"

type RenderJobRow = {
  id: string
  status: string
  result: Record<string, unknown> | null
  updated_at: string
  project_id: string
  owner_id: string
  requested_by: string
  payload: Record<string, unknown> | null
  output_asset_id: string | null
  created_at: string
}

type StreamSnapshot = {
  status: string
  progress: number | null
  stage: string | null
  updatedAt: string
}

const encoder = new TextEncoder()

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function getSnapshot(job: RenderJobRow): StreamSnapshot {
  const result = job.result && typeof job.result === "object" ? job.result : {}
  return {
    status: job.status,
    progress: getNumber(result.progress),
    stage: getString(result.stage),
    updatedAt: job.updated_at,
  }
}

function formatFrame(event: string, payload: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
}

function isTerminal(status: string) {
  return status === "completed" || status === "failed" || status === "canceled"
}

async function loadJob(ownerId: string, projectId: string, jobId: string): Promise<RenderJobRow | null> {
  const rows = (await sql`
    SELECT *
    FROM editor_render_jobs
    WHERE id=${jobId}
      AND project_id=${projectId}
      AND owner_id=${ownerId}
    LIMIT 1
  `) as RenderJobRow[]

  return rows[0] ?? null
}

export async function GET(request: Request) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const jobId = searchParams.get("jobId")

  if (!projectId || !jobId) {
    return new Response(JSON.stringify({ error: "projectId and jobId are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let stopped = false
      let latestSnapshot: StreamSnapshot | null = null
      let intervalId: ReturnType<typeof setInterval> | null = null
      let unsubscribe: (() => void) | null = null

      const stop = () => {
        if (stopped) return
        stopped = true
        if (intervalId) clearInterval(intervalId)
        if (unsubscribe) unsubscribe()
        try {
          controller.close()
        } catch {
          // stream already closed
        }
      }

      const pushJobEvents = (job: RenderJobRow, previous: StreamSnapshot | null) => {
        const snapshot = getSnapshot(job)
        const payload = {
          job: {
            id: job.id,
            status: job.status,
            result: {
              ...(job.result ?? {}),
              progress: snapshot.progress,
              stage: snapshot.stage,
            },
            projectId: job.project_id,
            ownerId: job.owner_id,
            requestedBy: job.requested_by,
            payload: job.payload ?? {},
            outputAssetId: job.output_asset_id,
            createdAt: job.created_at,
            updatedAt: snapshot.updatedAt,
          },
        }

        const statusChanged = !previous || previous.status !== snapshot.status
        const progressChanged = !previous || previous.progress !== snapshot.progress

        if (statusChanged) {
          controller.enqueue(formatFrame(snapshot.status, payload))
        }

        if (progressChanged && snapshot.progress !== null) {
          controller.enqueue(formatFrame("progress", payload))
        }

        latestSnapshot = snapshot

        if (isTerminal(snapshot.status)) {
          stop()
        }
      }

      const poll = async () => {
        if (stopped) return

        try {
          const job = await loadJob(auth.userId, projectId, jobId)
          if (!job) {
            controller.enqueue(formatFrame("failed", { error: "Render job not found" }))
            stop()
            return
          }

          const nextSnapshot = getSnapshot(job)
          if (
            !latestSnapshot ||
            latestSnapshot.status !== nextSnapshot.status ||
            latestSnapshot.progress !== nextSnapshot.progress ||
            latestSnapshot.updatedAt !== nextSnapshot.updatedAt
          ) {
            pushJobEvents(job, latestSnapshot)
          }
        } catch {
          controller.enqueue(formatFrame("failed", { error: "Unable to stream render progress" }))
          stop()
        }
      }

      unsubscribe = subscribeRenderJobEvents(auth.userId, {
        jobId,
        onEvent: (event) => {
          if (stopped || event.scope.projectId !== projectId) return

          const job: RenderJobRow = {
            id: event.job.id,
            status: event.job.status,
            result: event.job.result,
            updated_at: event.job.updatedAt,
            project_id: event.job.projectId,
            owner_id: event.job.ownerId,
            requested_by: event.job.requestedBy,
            payload: event.job.payload,
            output_asset_id: event.job.outputAssetId,
            created_at: event.job.createdAt,
          }

          pushJobEvents(job, latestSnapshot)
        },
      })

      controller.enqueue(encoder.encode("retry: 2000\n\n"))
      await poll()

      intervalId = setInterval(() => {
        void poll()
      }, 5000)

      request.signal.addEventListener("abort", () => {
        stop()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
