import { requireEditorOperation } from "@/app/api/editor/_lib"
import { lockSegment, unlockSegment } from "@/lib/editor/segment-locks"

export async function POST(request: Request, context: { params: Promise<{ projectId: string; segmentId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  return lockSegment({ projectId: params.projectId, segmentId: params.segmentId, userId: auth.userId })
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string; segmentId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  return unlockSegment({ projectId: params.projectId, segmentId: params.segmentId, userId: auth.userId })
}
