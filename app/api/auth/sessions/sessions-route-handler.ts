import { z } from "zod"
import { listActiveUserSessions, invalidateSession, type AuthSessionRecord } from "@/lib/auth/session-modes"

const revokeSchema = z
  .object({
    sessionId: z.string().trim().min(1).optional(),
    revokeAll: z.boolean().optional(),
  })
  .refine((value) => value.revokeAll === true || Boolean(value.sessionId), {
    message: "Either sessionId or revokeAll=true is required",
  })

export type SessionUser = {
  id: string
}

type ListDeps = {
  listSessions: (userId: string) => Promise<AuthSessionRecord[]>
}

type RevokeDeps = {
  invalidate: (options: { sessionId?: string; userId?: string; reason: string }) => Promise<void>
}

export async function handleListSessions(sessionUser: SessionUser | null, deps: ListDeps = { listSessions: listActiveUserSessions }) {
  if (!sessionUser?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 })
  }

  const sessions = await deps.listSessions(sessionUser.id)
  return Response.json({ sessions, concurrentSessionCount: sessions.length })
}

export async function handleRevokeSessions(
  request: Request,
  sessionUser: SessionUser | null,
  deps: RevokeDeps = { invalidate: invalidateSession },
) {
  if (!sessionUser?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ message: "Invalid request" }, { status: 400 })
  }

  if (parsed.data.revokeAll) {
    await deps.invalidate({ userId: sessionUser.id, reason: "user_requested_revoke_all" })
    return Response.json({ revoked: true, revokedAll: true })
  }

  await deps.invalidate({ sessionId: parsed.data.sessionId, reason: "user_requested_revoke_single" })
  return Response.json({ revoked: true, revokedAll: false })
}
