import { NextResponse } from "next/server"

import { getMostRecentSession } from "@/lib/repositories/runash-chat"

type ApiError = {
  code: string
  message: string
}

export async function GET() {
  try {
    const session = getMostRecentSession()

    if (!session) {
      return NextResponse.json(
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

    return NextResponse.json({
      success: true,
      data: session,
      error: null,
    })
  } catch {
    return NextResponse.json(
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
