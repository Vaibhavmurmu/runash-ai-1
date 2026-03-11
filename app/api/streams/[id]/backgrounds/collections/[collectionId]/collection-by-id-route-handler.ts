import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"

type OwnerResult = { error?: Response }

export type BackgroundCollectionByIdRouteDeps = {
  requireOwner: (request: Request, streamId: string) => Promise<OwnerResult>
  updateCollection: (streamId: string, collectionId: string, patch: unknown) => Promise<unknown>
  deleteCollection: (streamId: string, collectionId: string) => Promise<void>
}

export function createBackgroundCollectionByIdRoutes(deps: BackgroundCollectionByIdRouteDeps) {
  return {
    PATCH: async (request: NextRequest, { params }: { params: { id: string; collectionId: string } }) => {
      const access = await deps.requireOwner(request, params.id)
      if (access.error) return access.error

      try {
        const patch = await request.json()
        const collection = await deps.updateCollection(params.id, params.collectionId, patch)
        return respondSuccess(request, { collection })
      } catch {
        return respondError(request, { code: "STREAM_BACKGROUND_COLLECTION_UPDATE_FAILED", message: "Could not update collection." }, { status: 400 })
      }
    },
    DELETE: async (request: NextRequest, { params }: { params: { id: string; collectionId: string } }) => {
      const access = await deps.requireOwner(request, params.id)
      if (access.error) return access.error

      try {
        await deps.deleteCollection(params.id, params.collectionId)
        return respondSuccess(request, { deleted: true })
      } catch {
        return respondError(request, { code: "STREAM_BACKGROUND_COLLECTION_DELETE_FAILED", message: "Could not delete collection." }, { status: 400 })
      }
    },
  }
}
