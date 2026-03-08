import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { requireActivityVisible } from "@/app/api/editor/projects/_permissions"
import {
  appendProjectActivity,
  inviteProjectCollaborator,
  listProjectActivity,
  listProjectCollaborators,
  listProjectInvites,
} from "@/lib/editor/collaboration-repository"
import { getProjectById } from "@/lib/editor/repository"

const inviteCollaboratorSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["editor", "viewer"]),
})

function toCollaboratorPayload(record: Awaited<ReturnType<typeof listProjectCollaborators>>[number], currentUserId: string) {
  return {
    id: record.user_id ?? record.id,
    memberId: record.id,
    userId: record.user_id,
    name: record.name,
    email: record.email,
    avatar: record.avatar_url,
    status: record.status,
    role: record.role,
    lastActive: record.last_active_at,
    isCurrentUser: (record.user_id ?? record.id) === currentUserId,
  }
}

function toActivityPayload(record: Awaited<ReturnType<typeof listProjectActivity>>[number]) {
  return {
    id: record.id,
    user: record.actor_name,
    action: record.action,
    timestamp: record.created_at,
    type: record.activity_type,
    details: typeof record.details?.message === "string" ? record.details.message : undefined,
  }
}

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const activityGuard = await requireActivityVisible(projectId, auth.userId)

  const [members, activity] = await Promise.all([
    listProjectCollaborators(projectId, auth.userId),
    activityGuard ? Promise.resolve([]) : listProjectActivity(projectId, auth.userId, 100),
  ])

  const projectOwner = {
    id: auth.userId,
    memberId: `owner:${auth.userId}`,
    userId: auth.userId,
    name: "You",
    email: "",
    avatar: null,
    status: "online" as const,
    role: "owner" as const,
    lastActive: new Date().toISOString(),
    isCurrentUser: true,
  }

  return NextResponse.json({
    collaborators: [projectOwner, ...members.map((entry) => toCollaboratorPayload(entry, auth.userId))],
    activity: activity.map(toActivityPayload),
    activityVisible: !activityGuard,
    currentUser: {
      id: auth.userId,
      name: "You",
      role: auth.role,
    },
  })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = inviteCollaboratorSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const collaborator = await inviteProjectCollaborator({
    projectId,
    ownerId: auth.userId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedByUserId: auth.userId,
    invitedByName: "You",
  })

  await appendProjectActivity({
    projectId,
    ownerId: auth.userId,
    actorUserId: auth.userId,
    actorName: "System",
    action: `invite sent to ${parsed.data.email}`,
    activityType: "system",
    details: {
      message: "Invitation has been created and collaborator list refreshed.",
      collaboratorId: collaborator.id,
    },
  })

  const members = await listProjectCollaborators(projectId, auth.userId)
  return NextResponse.json({
    collaborator: toCollaboratorPayload(collaborator, auth.userId),
    collaborators: members.map((entry) => toCollaboratorPayload(entry, auth.userId)),
  })
}
