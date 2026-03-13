import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"

export async function POST(request: Request, { params: routeParamsPromise }: { params: Promise<{ jobId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      status='queued',
      attempt_count=LEAST(max_attempts, attempt_count + 1),
      next_retry_at=now(),
      canceled_at=NULL,
      cancellation_token=${randomUUID()},
      last_error_code=NULL,
      result=COALESCE(result, '{}'::jsonb) || jsonb_build_object(
        'stage', 'queued',
        'progress', 0,
        'finishedAt', null,
        'lastError', null,
        'attemptCount', LEAST(max_attempts, attempt_count + 1)
      ),
      updated_at=now()
    WHERE id=${params.jobId}
      AND owner_id=${auth.userId}
      AND status IN ('failed', 'canceled')
    RETURNING *
  `

  if (!job) {
    return NextResponse.json({ error: "Render job is not retryable" }, { status: 409 })
  }

  await sql`
    INSERT INTO editor_render_job_timeline (job_id, owner_id, from_status, to_status, event_type, event_payload)
    VALUES (${job.id}, ${auth.userId}, null, 'queued', 'user_retry', '{}'::jsonb)
  `

  publishRenderJobEvent({
    id: job.id,
    projectId: job.project_id,
    ownerId: job.owner_id,
    status: job.status,
    requestedBy: job.requested_by,
    payload: job.payload ?? {},
    result: job.result ?? {},
    outputAssetId: job.output_asset_id,
    attemptCount: Number(job.attempt_count ?? 0),
    maxAttempts: Number(job.max_attempts ?? 0),
    nextRetryAt: job.next_retry_at ?? null,
    cancellationToken: job.cancellation_token ?? null,
    canceledAt: job.canceled_at ?? null,
    lastErrorCode: job.last_error_code ?? null,
    providerTrace: job.provider_trace ?? {},
    providerOutput: job.provider_output ?? {},
    outputPublication: job.output_publication ?? {},
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  })

  return NextResponse.json({ job })
}
