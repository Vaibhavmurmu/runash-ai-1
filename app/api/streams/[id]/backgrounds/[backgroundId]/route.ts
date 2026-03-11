import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { deleteStreamBackground, updateStreamBackground } from "@/lib/repositories/stream-studio"
import { requireStreamOwner } from "../_auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string; backgroundId: string } }) {
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    const patch = await request.json()
    const background = await updateStreamBackground(params.id, params.backgroundId, patch)
    return respondSuccess(request, { background })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_UPDATE_FAILED", message: "Could not update background." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; backgroundId: string } }) {
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    await deleteStreamBackground(params.id, params.backgroundId)
    return respondSuccess(request, { deleted: true })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_DELETE_FAILED", message: "Could not delete background." }, { status: 400 })
  }
}
