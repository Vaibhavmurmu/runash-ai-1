import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"

type OwnerResult = { error?: Response }

export type BackgroundCollectionsRouteDeps = {
  requireOwner: (request: Request, streamId: string) => Promise<OwnerResult>
  listCollections: (streamId: string) => Promise<unknown[]>
  createCollection: (streamId: string, input: unknown) => Promise<unknown>
}

export function createBackgroundCollectionsRoutes(deps: BackgroundCollectionsRouteDeps) {
  return {
    GET: async (request: NextRequest, { params }: { params: { id: string } }) => {
      const access = await deps.requireOwner(request, params.id)
      if (access.error) return access.error

      try {
        const collections = await deps.listCollections(params.id)
        return respondSuccess(request, { collections })
      } catch {
        return respondError(request, { code: "STREAM_BACKGROUND_COLLECTIONS_NOT_FOUND", message: "Collections not found." }, { status: 404 })
      }
    },
    POST: async (request: NextRequest, { params }: { params: { id: string } }) => {
      const access = await deps.requireOwner(request, params.id)
      if (access.error) return access.error

      try {
        const input = await request.json()
        const collection = await deps.createCollection(params.id, input)
        return respondSuccess(request, { collection }, { status: 201 })
      } catch {
        return respondError(request, { code: "STREAM_BACKGROUND_COLLECTION_CREATE_FAILED", message: "Could not create collection." }, { status: 400 })
      }
    },
  }
}
