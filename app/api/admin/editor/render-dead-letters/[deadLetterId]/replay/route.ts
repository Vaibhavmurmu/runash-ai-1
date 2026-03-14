import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { sql } from "@/lib/editor/repository"

export async function POST(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ deadLetterId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.editor.render_dead_letter.replay",
  })
  if (!auth.success) return auth.response

  const [deadLetter] = await sql`
    SELECT *
    FROM editor_render_job_dead_letters
    WHERE id=${params.deadLetterId}
    LIMIT 1
  `

  if (!deadLetter) {
    return NextResponse.json({ error: "Dead-letter record not found" }, { status: 404 })
  }

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      status='queued',
      next_retry_at=now(),
      cancellation_token=${randomUUID()},
      result=COALESCE(result, '{}'::jsonb) || jsonb_build_object('stage', 'queued', 'progress', 0, 'finishedAt', null),
      updated_at=now()
    WHERE id=${deadLetter.job_id}
    RETURNING *
  `

  if (!job) {
    return NextResponse.json({ error: "Unable to replay dead-lettered job" }, { status: 409 })
  }

  await sql`
    UPDATE editor_render_job_dead_letters
    SET replay_count = replay_count + 1,
        last_replayed_at = now(),
        updated_at = now()
    WHERE id=${params.deadLetterId}
  `

  await sql`
    INSERT INTO editor_render_job_timeline (job_id, owner_id, from_status, to_status, event_type, event_payload)
    VALUES (${job.id}, ${job.owner_id}, 'failed', 'queued', 'admin_replay', ${JSON.stringify({ deadLetterId: params.deadLetterId, adminUserId: auth.userId })}::jsonb)
  `

  return NextResponse.json({ job, deadLetterId: params.deadLetterId, replayed: true })
}
