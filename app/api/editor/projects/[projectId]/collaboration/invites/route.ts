import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { createProjectInvite, listProjectInvites } from "@/lib/editor/collaboration-repository"
import { getProjectById } from "@/lib/editor/repository"

const createInviteSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["editor", "viewer"]).default("editor"),
  expiresInHours: z.number().int().min(1).max(24 * 14).optional(),
})

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const invites = await listProjectInvites(projectId, auth.userId)
  return NextResponse.json({ invites })
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const { projectId } = params
  const project = await getProjectById(auth.userId, projectId)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = createInviteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const invite = await createProjectInvite({
    projectId,
    ownerId: auth.userId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedByUserId: auth.userId,
    invitedByName: "You",
    expiresInHours: parsed.data.expiresInHours,
  })

  return NextResponse.json({
    invite,
    inviteLink: `/editor/invite/${invite.token}`,
  }, { status: 201 })
}
