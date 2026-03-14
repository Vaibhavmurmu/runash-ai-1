import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { deleteStreamBackgroundCategory, updateStreamBackgroundCategory } from "@/lib/repositories/stream-studio"
import { requireStreamOwner } from "../../_auth"

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string; categoryId: string }> }) {
  const params = await routeParamsPromise
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    const patch = await request.json()
    const category = await updateStreamBackgroundCategory(params.id, params.categoryId, patch)
    return respondSuccess(request, { category })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_CATEGORY_UPDATE_FAILED", message: "Could not update category." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string; categoryId: string }> }) {
  const params = await routeParamsPromise
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    await deleteStreamBackgroundCategory(params.id, params.categoryId)
    return respondSuccess(request, { deleted: true })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_CATEGORY_DELETE_FAILED", message: "Could not delete category." }, { status: 400 })
  }
}
