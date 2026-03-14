import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { getServerAuthSession } from "@/lib/auth/session"
import { getStreamMetadata, saveStreamMetadata } from "@/lib/repositories/stream-studio"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const metadata = await getStreamMetadata(params.id)
    return respondSuccess(request, { metadata })
  } catch {
    return respondError(request, { code: "STREAM_METADATA_NOT_FOUND", message: "Stream metadata not found." }, { status: 404 })
  }
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const session = await getServerAuthSession()
  if (!session) {
    return respondError(request, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401 })
  }

  try {
    const patch = await request.json()
    const metadata = await saveStreamMetadata(params.id, patch)
    return respondSuccess(request, { metadata })
  } catch {
    return respondError(request, { code: "STREAM_METADATA_UPDATE_FAILED", message: "Could not update metadata." }, { status: 400 })
  }
}
