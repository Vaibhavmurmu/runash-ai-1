import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"

export async function POST(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      status='queued',
      next_retry_at=now(),
      cancellation_token=${randomUUID()},
      result=COALESCE(result, '{}'::jsonb) || jsonb_build_object(
        'stage', 'queued',
        'progress', 0,
        'finishedAt', null
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
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  })

  return NextResponse.json({ job })
}
