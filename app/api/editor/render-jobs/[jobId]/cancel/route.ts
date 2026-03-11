import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"

export async function POST(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      status='canceled',
      canceled_at=now(),
      cancellation_token=${randomUUID()},
      last_error_code='EDITOR_RENDER_CANCELED',
      result=COALESCE(result, '{}'::jsonb) || jsonb_build_object(
        'finishedAt', now(),
        'progress', 100,
        'stage', 'canceled',
        'lastError', null,
        'errorCode', 'EDITOR_RENDER_CANCELED'
      ),
      updated_at=now()
    WHERE id=${params.jobId}
      AND owner_id=${auth.userId}
      AND status IN ('queued', 'processing', 'retrying')
    RETURNING *
  `

  if (!job) {
    return NextResponse.json({ error: "Render job cannot be canceled in current state" }, { status: 409 })
  }

  await sql`
    INSERT INTO editor_render_job_timeline (job_id, owner_id, from_status, to_status, event_type, event_payload)
    VALUES (${job.id}, ${auth.userId}, null, 'canceled', 'user_cancel', '{}'::jsonb)
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
