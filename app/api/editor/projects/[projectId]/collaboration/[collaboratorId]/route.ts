import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { listProjectCollaborators, revokeProjectCollaborator } from "@/lib/editor/collaboration-repository"
import { getProjectById } from "@/lib/editor/repository"

export async function DELETE(request: Request, { params: routeParamsPromise }: { params: Promise<{ projectId: string; collaboratorId: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId, collaboratorId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const removed = await revokeProjectCollaborator({
    projectId,
    ownerId: auth.userId,
    collaboratorId,
    revokedByUserId: auth.userId,
    revokedByName: "You",
  })

  if (!removed) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
  }

  const collaborators = await listProjectCollaborators(projectId, auth.userId)
  return NextResponse.json({
    removedId: removed.id,
    collaborators: collaborators.map((entry) => ({
      id: entry.user_id ?? entry.id,
      memberId: entry.id,
      userId: entry.user_id,
      name: entry.name,
      email: entry.email,
      avatar: entry.avatar_url,
      status: entry.status,
      role: entry.role,
      lastActive: entry.last_active_at,
      isCurrentUser: (entry.user_id ?? entry.id) === auth.userId,
    })),
  })
}
