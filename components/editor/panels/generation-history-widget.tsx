"use client"

import { Button } from "@/components/ui/button"
import type { EditorRenderJob } from "@/lib/editor/domain"

interface GenerationHistoryWidgetProps {
  jobs: EditorRenderJob[]
  actionState: {
    cancelingJobId: string | null
    retryingJobId: string | null
  }
  onCancel: (jobId: string) => void
  onRetry: (jobId: string) => void
}

function formatTimestamp(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

export function GenerationHistoryWidget({ jobs, actionState, onCancel, onRetry }: GenerationHistoryWidgetProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Generation history</h3>
        <p className="mt-1 text-xs text-muted-foreground">Track attempts, status changes, and retry/cancel actions.</p>
      </div>
      <div className="space-y-3">
        {jobs.length === 0 && <p className="text-xs text-muted-foreground">No generations yet for this project.</p>}
        {jobs.map((job) => {
          const canCancel = ["queued", "processing", "retrying"].includes(job.status)
          const canRetry = ["failed", "canceled"].includes(job.status)
          return (
            <div key={job.id} className="rounded-md border border-border/70 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{job.status}</span>
                <span className="text-muted-foreground">Attempts {job.attemptCount}/{job.maxAttempts}</span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground">
                <p>Created: {formatTimestamp(job.createdAt)}</p>
                <p>Updated: {formatTimestamp(job.updatedAt)}</p>
                <p>Canceled: {formatTimestamp(job.canceledAt)}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled={!canCancel || actionState.cancelingJobId === job.id} onClick={() => onCancel(job.id)}>
                  {actionState.cancelingJobId === job.id ? "Canceling…" : "Cancel"}
                </Button>
                <Button size="sm" variant="secondary" disabled={!canRetry || actionState.retryingJobId === job.id} onClick={() => onRetry(job.id)}>
                  {actionState.retryingJobId === job.id ? "Retrying…" : "Retry"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
