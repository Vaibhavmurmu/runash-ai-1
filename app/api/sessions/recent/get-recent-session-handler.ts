import type { RunashSession } from "../../../../lib/repositories/runash-chat"

type ApiError = {
  code: string
  message: string
}

export type RecentSessionDependencies = {
  getMostRecentSession: () => RunashSession | null
}

export async function handleGetRecentSession(dependencies: RecentSessionDependencies) {
  try {
    const session = dependencies.getMostRecentSession()

    if (!session) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "SESSION_NOT_FOUND",
            message: "No recent session exists",
          } satisfies ApiError,
        },
        { status: 404 },
      )
    }

    return Response.json({
      success: true,
      data: session,
      error: null,
    })
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "SESSION_RECENT_FETCH_FAILED",
          message: "Unable to fetch the recent session",
        } satisfies ApiError,
      },
      { status: 500 },
    )
  }
}
