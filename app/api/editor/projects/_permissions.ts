import { NextResponse } from "next/server"
import { getCollaborationSettings } from "@/lib/editor/collaboration-repository"

export async function requireEditingEnabled(projectId: string, ownerId: string): Promise<NextResponse | null> {
  const settings = await getCollaborationSettings(projectId, ownerId)
  if (!settings.allowEditing) {
    return NextResponse.json(
      {
        error: "Editing is disabled for this project",
        code: "EDITOR_COLLABORATION_EDITING_DISABLED",
      },
      { status: 403 },
    )
  }

  return null
}

export async function requireActivityVisible(projectId: string, ownerId: string): Promise<NextResponse | null> {
  const settings = await getCollaborationSettings(projectId, ownerId)
  if (!settings.showActivityLog) {
    return NextResponse.json(
      {
        error: "Activity log visibility is disabled for this project",
        code: "EDITOR_COLLABORATION_ACTIVITY_HIDDEN",
      },
      { status: 403 },
    )
  }

  return null
}
