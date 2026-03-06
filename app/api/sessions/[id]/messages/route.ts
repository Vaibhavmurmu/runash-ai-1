import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { isSessionOwnedByUser, listSessionMessages } from "@/lib/repositories/runash-chat"

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const querySchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

type RouteContext = {
  params: {
    id: string
  }
}

async function getAuthenticatedUserId() {
  const session = await getServerAuthSession()
  return session?.user?.id ? String(session.user.id) : null
}

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = resolveRequestId(request)
  const userId = await getAuthenticatedUserId()

  if (!userId) {
    return respondError(request, { code: "AUTH_REQUIRED", message: "Unauthorized" }, { status: 401, requestId })
  }

  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return respondError(request, { code: "SESSION_ID_REQUIRED", message: "Session id is required" }, { status: 400, requestId })
  }

  const url = new URL(request.url)
  const parsedQuery = querySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? 20,
  })

  if (!parsedQuery.success) {
    return respondError(request, { code: "INVALID_REQUEST", message: "Invalid cursor or limit" }, { status: 400, requestId })
  }

  const isOwned = await isSessionOwnedByUser(parsedParams.data.id, userId)
  if (!isOwned) {
    return respondError(request, { code: "SESSION_ACCESS_DENIED", message: "Forbidden" }, { status: 403, requestId })
  }

  const messages = await listSessionMessages(parsedParams.data.id, parsedQuery.data.limit, userId, parsedQuery.data.cursor)
  const nextCursor = messages.length === parsedQuery.data.limit ? String(messages[messages.length - 1]?.id ?? "") : null

  return respondSuccess(
    request,
    {
      items: messages,
      nextCursor,
    },
    { requestId },
  )
}
