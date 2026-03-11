import assert from "node:assert/strict"
import test from "node:test"
import { createTemplateByIdRoutes } from "./[id]/route"
import { createTemplateRoutes } from "./route"

function createDeps() {
  const store = new Map<string, Array<any>>()

  const requireUserId = async (request: Request) => {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
    return auth.replace("Bearer ", "")
  }

  const listTemplates = async (userId: string) => [...(store.get(userId) ?? [])]

  const createTemplate = async (userId: string, input: any) => {
    const now = new Date().toISOString()
    const template = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now }
    const current = store.get(userId) ?? []
    store.set(userId, [template, ...current])
    return template
  }

  const updateTemplate = async (userId: string, id: string, input: any) => {
    const current = store.get(userId) ?? []
    const index = current.findIndex((item) => item.id === id)
    if (index === -1) return null

    const next = { ...current[index], ...input, updatedAt: new Date().toISOString() }
    current[index] = next
    store.set(userId, current)

    return next
  }

  const deleteTemplate = async (userId: string, id: string) => {
    const current = store.get(userId) ?? []
    const next = current.filter((item) => item.id !== id)
    store.set(userId, next)
    return next.length !== current.length
  }

  return { requireUserId, listTemplates, createTemplate, updateTemplate, deleteTemplate }
}

test("template routes enforce auth for all methods", async () => {
  const deps = createDeps()
  const routes = createTemplateRoutes(deps)
  const byIdRoutes = createTemplateByIdRoutes(deps)

  const getResponse = await routes.GET(new Request("http://localhost"))
  assert.equal(getResponse.status, 401)

  const postResponse = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Template", title: "Title" }),
    }),
  )
  assert.equal(postResponse.status, 401)

  const putResponse = await byIdRoutes.PUT(
    new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Title" }),
    }),
    { params: { id: "template-id" } },
  )
  assert.equal(putResponse.status, 401)

  const deleteResponse = await byIdRoutes.DELETE(new Request("http://localhost", { method: "DELETE" }), {
    params: { id: "template-id" },
  })
  assert.equal(deleteResponse.status, 401)
})

test("template routes support CRUD with backward-compatible payload shape", async () => {
  const deps = createDeps()
  const routes = createTemplateRoutes(deps)
  const byIdRoutes = createTemplateByIdRoutes(deps)

  const createMissingFields = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ title: "Missing Name" }),
    }),
  )
  assert.equal(createMissingFields.status, 400)

  const createdResponse = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ name: "Template A", title: "Title A", tags: ["a"] }),
    }),
  )
  assert.equal(createdResponse.status, 201)
  const created = await createdResponse.json()
  assert.equal(typeof created.id, "string")

  const userAListResponse = await routes.GET(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-a" },
    }),
  )
  assert.equal(userAListResponse.status, 200)
  const userAList = await userAListResponse.json()
  assert.deepEqual(Object.keys(userAList), ["templates"])
  assert.equal(userAList.templates.length, 1)
  assert.equal(userAList.templates[0].id, created.id)

  const userAUpdate = await byIdRoutes.PUT(
    new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ title: "  Title A Updated  " }),
    }),
    { params: { id: created.id } },
  )
  assert.equal(userAUpdate.status, 200)
  const updated = await userAUpdate.json()
  assert.equal(updated.title, "Title A Updated")

  const userADelete = await byIdRoutes.DELETE(
    new Request("http://localhost", {
      method: "DELETE",
      headers: { authorization: "Bearer user-a" },
    }),
    { params: { id: created.id } },
  )
  assert.equal(userADelete.status, 200)
  assert.deepEqual(await userADelete.json(), { ok: true })

  const userAListAfterDeleteResponse = await routes.GET(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-a" },
    }),
  )
  const userAListAfterDelete = await userAListAfterDeleteResponse.json()
  assert.equal(userAListAfterDelete.templates.length, 0)
})

test("template routes enforce cross-user isolation", async () => {
  const deps = createDeps()
  const routes = createTemplateRoutes(deps)
  const byIdRoutes = createTemplateByIdRoutes(deps)

  const createUserATemplate = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ name: "Template A", title: "Title A", tags: ["a"] }),
    }),
  )
  assert.equal(createUserATemplate.status, 201)
  const userATemplate = await createUserATemplate.json()

  const createUserBTemplate = await routes.POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-b" },
      body: JSON.stringify({ name: "Template B", title: "Title B", tags: ["b"] }),
    }),
  )
  assert.equal(createUserBTemplate.status, 201)
  const userBTemplate = await createUserBTemplate.json()

  const userBUpdateOnA = await byIdRoutes.PUT(
    new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer user-b" },
      body: JSON.stringify({ title: "Hacked" }),
    }),
    { params: { id: userATemplate.id } },
  )
  assert.equal(userBUpdateOnA.status, 404)

  const userADeleteOnB = await byIdRoutes.DELETE(
    new Request("http://localhost", {
      method: "DELETE",
      headers: { authorization: "Bearer user-a" },
    }),
    { params: { id: userBTemplate.id } },
  )
  assert.equal(userADeleteOnB.status, 404)

  const userBListResponse = await routes.GET(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-b" },
    }),
  )
  const userBList = await userBListResponse.json()
  assert.equal(userBList.templates.length, 1)
  assert.equal(userBList.templates[0].id, userBTemplate.id)
})
