import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { createStreamBackgroundCategory, listStreamBackgroundCategories } from "@/lib/repositories/stream-studio"
import { requireStreamOwner } from "../_auth"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    const categories = await listStreamBackgroundCategories(params.id)
    return respondSuccess(request, { categories })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_CATEGORIES_NOT_FOUND", message: "Categories not found." }, { status: 404 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    const input = await request.json()
    const category = await createStreamBackgroundCategory(params.id, input)
    return respondSuccess(request, { category }, { status: 201 })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_CATEGORY_CREATE_FAILED", message: "Could not create category." }, { status: 400 })
  }
}
