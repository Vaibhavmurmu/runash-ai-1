import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/editor/repository"

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { jobId } = params

  const [job] = await sql`SELECT * FROM editor_render_jobs WHERE id=${jobId} AND owner_id=${auth.userId}`
  if (!job) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  return NextResponse.json({ job })
}

export async function PATCH(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { jobId } = params
  const body = await request.json()

  const [job] = await sql`
    UPDATE editor_render_jobs
    SET
      status=COALESCE(${body.status ?? null}, status),
      result=COALESCE(${body.result ? JSON.stringify(body.result) : null}::jsonb, result),
      output_asset_id=COALESCE(${body.outputAssetId ?? null}, output_asset_id),
      updated_at=now()
    WHERE id=${jobId} AND owner_id=${auth.userId}
    RETURNING *
  `

  if (!job) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  return NextResponse.json({ job })
}

export async function DELETE(request: Request, { params }: { params: { jobId: string } }) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error
  const { jobId } = params

  const rows = await sql`DELETE FROM editor_render_jobs WHERE id=${jobId} AND owner_id=${auth.userId} RETURNING id`
  if (!rows.length) return NextResponse.json({ error: "Render job not found" }, { status: 404 })

  return NextResponse.json({ deleted: true, jobId })
}
