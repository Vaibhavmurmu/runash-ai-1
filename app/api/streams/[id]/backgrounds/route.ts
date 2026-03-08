import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { createStreamBackground, listStreamBackgrounds } from "@/lib/repositories/stream-studio"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const backgrounds = await listStreamBackgrounds(params.id)
    return respondSuccess(request, { backgrounds })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUNDS_NOT_FOUND", message: "Backgrounds not found." }, { status: 404 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const input = await request.json()
    const background = await createStreamBackground(params.id, input)
    return respondSuccess(request, { background }, { status: 201 })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_CREATE_FAILED", message: "Could not create background." }, { status: 400 })
  }
}
