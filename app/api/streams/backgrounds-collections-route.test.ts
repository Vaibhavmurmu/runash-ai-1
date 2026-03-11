import assert from "node:assert/strict"
import test from "node:test"
import { createBackgroundCollectionsRoutes } from "./[id]/backgrounds/collections/collections-route-handler"
import { createBackgroundCollectionByIdRoutes } from "./[id]/backgrounds/collections/[collectionId]/collection-by-id-route-handler"

type Collection = {
  id: string
  name: string
  description: string
  backgrounds: string[]
  coverImage: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

function createDeps() {
  const store = new Map<string, Collection[]>()

  const requireOwner = async (request: Request, streamId: string) => {
    const header = request.headers.get("authorization")
    if (!header) {
      return { error: Response.json({ error: { message: "Unauthorized" } }, { status: 401 }) }
    }
    const user = header.replace("Bearer ", "")
    if (streamId !== `${user}-stream`) {
      return { error: Response.json({ error: { message: "Stream not found or unauthorized" } }, { status: 404 }) }
    }
    return { session: { user: { id: user } } }
  }

  const listCollections = async (streamId: string) => [...(store.get(streamId) ?? [])]

  const createCollection = async (streamId: string, input: Omit<Collection, "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString()
    const entry: Collection = { ...input, createdAt: now, updatedAt: now }
    store.set(streamId, [entry, ...(store.get(streamId) ?? []).filter((item) => item.id !== entry.id)])
    return entry
  }

  const updateCollection = async (streamId: string, collectionId: string, patch: Partial<Collection>) => {
    const current = store.get(streamId) ?? []
    const index = current.findIndex((item) => item.id === collectionId)
    if (index < 0) throw new Error("not found")
    const next = { ...current[index], ...patch, updatedAt: new Date().toISOString() }
    current[index] = next
    store.set(streamId, current)
    return next
  }

  const deleteCollection = async (streamId: string, collectionId: string) => {
    const current = store.get(streamId) ?? []
    store.set(streamId, current.filter((entry) => entry.id !== collectionId))
  }

  return { requireOwner, listCollections, createCollection, updateCollection, deleteCollection }
}

test("background collection routes enforce auth and ownership", async () => {
  const deps = createDeps()
  const routes = createBackgroundCollectionsRoutes(deps)
  const byId = createBackgroundCollectionByIdRoutes(deps)

  const unauthList = await routes.GET(new Request("http://localhost"), { params: { id: "user-a-stream" } })
  assert.equal(unauthList.status, 401)

  const notOwnerList = await routes.GET(
    new Request("http://localhost", { headers: { authorization: "Bearer user-a" } }),
    { params: { id: "user-b-stream" } },
  )
  assert.equal(notOwnerList.status, 404)

  const notOwnerDelete = await byId.DELETE(
    new Request("http://localhost", { method: "DELETE", headers: { authorization: "Bearer user-a" } }),
    { params: { id: "user-b-stream", collectionId: "x" } },
  )
  assert.equal(notOwnerDelete.status, 404)
})

test("background collection routes support CRUD", async () => {
  const deps = createDeps()
  const routes = createBackgroundCollectionsRoutes(deps)
  const byId = createBackgroundCollectionByIdRoutes(deps)

  const createdResponse = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({
        id: "col-1",
        name: "Favorites",
        description: "fav",
        backgrounds: ["bg-1"],
        coverImage: "/placeholder.svg",
        isPublic: true,
      }),
    }),
    { params: { id: "user-a-stream" } },
  )
  assert.equal(createdResponse.status, 201)
  const createdPayload = await createdResponse.json()
  assert.equal(createdPayload.data.collection.id, "col-1")

  const listResponse = await routes.GET(
    new Request("http://localhost", { headers: { authorization: "Bearer user-a" } }),
    { params: { id: "user-a-stream" } },
  )
  const listPayload = await listResponse.json()
  assert.equal(listPayload.data.collections.length, 1)

  const patchResponse = await byId.PATCH(
    new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ name: "Favorites Updated" }),
    }),
    { params: { id: "user-a-stream", collectionId: "col-1" } },
  )
  assert.equal(patchResponse.status, 200)
  const patchedPayload = await patchResponse.json()
  assert.equal(patchedPayload.data.collection.name, "Favorites Updated")

  const deleteResponse = await byId.DELETE(
    new Request("http://localhost", { method: "DELETE", headers: { authorization: "Bearer user-a" } }),
    { params: { id: "user-a-stream", collectionId: "col-1" } },
  )
  assert.equal(deleteResponse.status, 200)

  const listAfterDelete = await routes.GET(
    new Request("http://localhost", { headers: { authorization: "Bearer user-a" } }),
    { params: { id: "user-a-stream" } },
  )
  const listAfterDeletePayload = await listAfterDelete.json()
  assert.equal(listAfterDeletePayload.data.collections.length, 0)
})
