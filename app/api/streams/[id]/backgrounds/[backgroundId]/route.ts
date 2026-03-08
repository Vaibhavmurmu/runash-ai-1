import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { deleteStreamBackground, updateStreamBackground } from "@/lib/repositories/stream-studio"

export async function PATCH(request: NextRequest, { params }: { params: { id: string; backgroundId: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const patch = await request.json()
    const background = await updateStreamBackground(params.id, params.backgroundId, patch)
    return respondSuccess(request, { background })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_UPDATE_FAILED", message: "Could not update background." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; backgroundId: string } }) {
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    await deleteStreamBackground(params.id, params.backgroundId)
    return respondSuccess(request, { deleted: true })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_DELETE_FAILED", message: "Could not delete background." }, { status: 400 })
  }
}
