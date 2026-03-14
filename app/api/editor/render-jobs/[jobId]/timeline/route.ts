import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request, { params: routeParamsPromise }: { params: Promise<{ jobId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const [job] = await sql`SELECT id FROM editor_render_jobs WHERE id=${params.jobId} AND owner_id=${auth.userId} LIMIT 1`
  if (!job) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  const timeline = await sql`
    SELECT id, from_status, to_status, event_type, event_payload, created_at
    FROM editor_render_job_timeline
    WHERE job_id=${params.jobId}
      AND owner_id=${auth.userId}
    ORDER BY created_at ASC
  `

  return NextResponse.json({ timeline })
}
