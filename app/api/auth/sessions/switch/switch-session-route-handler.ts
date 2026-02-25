import { z } from "zod"
import { switchUserSessionScope } from "@/lib/auth/session-modes"

const schema = z.object({
  sessionId: z.string().min(1),
  scope: z.string().trim().min(1).max(120),
})

export type SessionUser = {
  id: string
}

type SwitchDeps = {
  switchScope: (userId: string, sessionId: string, scope: string) => Promise<{ id: string; userId: string; scope: string } | null>
}

export async function handleSwitchSessionScope(
  request: Request,
  sessionUser: SessionUser | null,
  deps: SwitchDeps = { switchScope: switchUserSessionScope },
) {
  if (!sessionUser?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ message: "Invalid request" }, { status: 400 })
  }

  const switched = await deps.switchScope(sessionUser.id, parsed.data.sessionId, parsed.data.scope)
  if (!switched) {
    return Response.json({ message: "Session not found" }, { status: 404 })
  }

  return Response.json({ session: switched })
}
