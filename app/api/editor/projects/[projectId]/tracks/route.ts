import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { buildInvalidRequestError } from "@/lib/api/contracts"
import { bumpTimelineVersion, claimProjectVersion, parseExpectedVersion } from "@/lib/editor/versioned-mutations"
import { sql } from "@/lib/editor/repository"

const createEditorTrackSchema = z.object({
  timelineId: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  trackType: z.string().trim().min(1).max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
})

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const { searchParams } = new URL(request.url)
  const timelineId = searchParams.get("timelineId")

  const tracks = timelineId
    ? await sql`SELECT * FROM editor_tracks WHERE project_id=${projectId} AND timeline_id=${timelineId} AND owner_id=${auth.userId} ORDER BY order_index, created_at`
    : await sql`SELECT * FROM editor_tracks WHERE project_id=${projectId} AND owner_id=${auth.userId} ORDER BY order_index, created_at`

  return NextResponse.json({ tracks })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error
  const { projectId } = params
  const body = await request.json().catch(() => ({}))

  const parsedBody = createEditorTrackSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(buildInvalidRequestError(parsedBody.error), { status: 400 })
  }

  const version = parseExpectedVersion(request, parsedBody.data)
  if ("error" in version) return version.error

  const claim = await claimProjectVersion({
    projectId,
    userId: auth.userId,
    expectedVersion: version.expectedVersion,
    mutation: "track.create",
    targetType: "track",
  })
  if (!claim.ok) return claim.response

  const [track] = await sql`
    INSERT INTO editor_tracks (timeline_id, project_id, owner_id, label, order_index, track_type, metadata)
    VALUES (
      ${parsedBody.data.timelineId},
      ${projectId},
      ${auth.userId},
      ${parsedBody.data.label || "Track"},
      ${parsedBody.data.orderIndex || 0},
      ${parsedBody.data.trackType || "video"},
      ${JSON.stringify(parsedBody.data.metadata || {})}::jsonb
    )
    RETURNING *
  `

  await bumpTimelineVersion(parsedBody.data.timelineId, projectId, auth.userId)
  return NextResponse.json({ track, version: claim.projectVersion }, { status: 201 })
}
