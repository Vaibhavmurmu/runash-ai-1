import { NextResponse } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { acceptProjectInvite } from "@/lib/editor/collaboration-repository"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(request: Request, { params: routeParamsPromise }: { params: Promise<{ token: string }> }) {
  const params = await routeParamsPromise
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const session = await getServerAuthSession(request.headers)
  const userEmail = session?.user?.email?.trim().toLowerCase()
  if (!userEmail) {
    return NextResponse.json(
      {
        error: "Verified email is required to accept invite",
        code: "EDITOR_INVITE_EMAIL_REQUIRED",
      },
      { status: 400 },
    )
  }

  const token = params.token?.trim()
  if (!token) {
    return NextResponse.json({ error: "Invite token is required", code: "INVALID_REQUEST" }, { status: 400 })
  }

  const result = await acceptProjectInvite({
    token,
    userId: auth.userId,
    userEmail,
    userName: session?.user?.name?.trim() || userEmail,
  })

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Invite not found", code: "EDITOR_INVITE_NOT_FOUND" }, { status: 404 })
  }

  if (result.status === "not_pending") {
    return NextResponse.json({ error: "Invite has already been used", code: "EDITOR_INVITE_NOT_PENDING" }, { status: 409 })
  }

  if (result.status === "expired") {
    return NextResponse.json({ error: "Invite expired", code: "EDITOR_INVITE_EXPIRED" }, { status: 410 })
  }

  if (result.status === "email_mismatch") {
    return NextResponse.json(
      {
        error: "Signed-in account email does not match invite email",
        code: "EDITOR_INVITE_EMAIL_MISMATCH",
      },
      { status: 403 },
    )
  }

  return NextResponse.json({
    accepted: true,
    projectId: result.invite.project_id,
    role: result.invite.role,
    collaboratorId: result.collaborator.id,
  })
}
