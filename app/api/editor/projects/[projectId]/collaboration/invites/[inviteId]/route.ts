import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { revokeProjectInvite } from "@/lib/editor/collaboration-repository"
import { getProjectById } from "@/lib/editor/repository"

export async function DELETE(request: Request, { params }: { params: { projectId: string; inviteId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId, inviteId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const invite = await revokeProjectInvite({
    projectId,
    ownerId: auth.userId,
    inviteId,
    revokedByUserId: auth.userId,
    revokedByName: "You",
  })

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }

  return NextResponse.json({ revoked: true, inviteId: invite.id })
}
