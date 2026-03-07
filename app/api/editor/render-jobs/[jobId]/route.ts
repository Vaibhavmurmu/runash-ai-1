import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { buildInvalidRequestError } from "@/lib/api/contracts"
import { publishRenderJobEvent } from "@/lib/editor/render-job-events"
import { sql } from "@/lib/editor/repository"

const updateRenderJobSchema = z.object({
  status: z.literal("canceled").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error
  const { jobId } = params

  const [job] = await sql`SELECT * FROM editor_render_jobs WHERE id=${jobId} AND owner_id=${auth.userId}`
  if (!job) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  return NextResponse.json({ job })
}

export async function PATCH(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorOperation(request, "run_generation")
  if ("error" in auth) return auth.error
  const { jobId } = params
  const body = await request.json().catch(() => ({}))

  const parsedBody = updateRenderJobSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const metadata = asObject(parsedBody.data.metadata)
  const shouldCancel = parsedBody.data.status === "canceled"

  if (shouldCancel) {
    const [job] = await sql`
      UPDATE editor_render_jobs
      SET
        status='canceled',
        result=jsonb_set(
          COALESCE(result, '{}'::jsonb) || jsonb_build_object(
            'finishedAt', now(),
            'progress', 100,
            'stage', 'canceled',
            'lastError', null,
            'errorCode', 'EDITOR_RENDER_CANCELED'
          ),
          '{canceledAt}',
          to_jsonb(now()),
          true
        ),
        updated_at=now()
      WHERE id=${jobId}
        AND owner_id=${auth.userId}
        AND status IN ('queued', 'processing', 'retrying')
      RETURNING *
    `

    if (!job) {
      const [existingJob] = await sql`SELECT * FROM editor_render_jobs WHERE id=${jobId} AND owner_id=${auth.userId}`
      if (!existingJob) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

      return NextResponse.json(
        {
          error: "Render job can only be canceled while queued or processing",
          code: "EDITOR_RENDER_CANCEL_INVALID_STATE",
          status: existingJob.status,
        },
        { status: 409 },
      )
    }

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

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      payload=CASE
        WHEN ${Object.keys(metadata).length > 0}
          THEN jsonb_set(
            payload,
            '{metadata}',
            COALESCE(payload->'metadata', '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
            true
          )
        ELSE payload
      END,
      updated_at=now()
    WHERE id=${jobId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!job) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  return NextResponse.json({ job })
}
