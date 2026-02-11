import type { RunashSessionMessage } from "../../../../../lib/repositories/runash-chat"

type ApiError = {
  code: string
  message: string
}

const DEFAULT_LIMIT = 4
const MAX_LIMIT = 50

function getLimit(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit")
  if (!rawLimit) return DEFAULT_LIMIT

  const parsed = Number.parseInt(rawLimit, 10)
  if (Number.isNaN(parsed) || parsed < 1) return null
  return Math.min(parsed, MAX_LIMIT)
}

export type SessionMessagesDependencies = {
  listSessionMessages: (sessionId: string, limit?: number) => RunashSessionMessage[]
}

export async function handleGetSessionMessages(
  request: Request,
  params: { id: string },
  dependencies: SessionMessagesDependencies,
) {
  try {
    const sessionId = String(params?.id ?? "").trim()
    if (!sessionId) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "SESSION_ID_REQUIRED",
            message: "Session id is required",
          } satisfies ApiError,
        },
        { status: 400 },
      )
    }

    const url = new URL(request.url)
    const limit = getLimit(url.searchParams)

    if (limit === null) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "INVALID_LIMIT",
            message: "limit must be a positive integer",
          } satisfies ApiError,
        },
        { status: 400 },
      )
    }

    const messages = dependencies.listSessionMessages(sessionId, limit)

    return Response.json({
      success: true,
      data: messages,
      error: null,
    })
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SESSION_MESSAGES_FETCH_FAILED",
          message: "Unable to fetch session messages",
        } satisfies ApiError,
      },
      { status: 500 },
    )
  }
}
