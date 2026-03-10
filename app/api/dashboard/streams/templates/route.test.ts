import assert from "node:assert/strict"
import test from "node:test"
import { handleTemplatesGet, handleTemplatesPost } from "./templates-route-handler"
import { handleTemplateDelete, handleTemplatePut } from "./[id]/template-by-id-route-handler"

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

test("dashboard stream template handlers enforce auth and CRUD", async () => {
  const deps = createDeps()

  const unauth = await handleTemplatesGet(new Request("http://localhost"), deps)
  assert.equal(unauth.status, 401)

  const createMissingFields = await handleTemplatesPost(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ title: "Missing Name" }),
    }),
    deps,
  )
  assert.equal(createMissingFields.status, 400)

  const createdResponse = await handleTemplatesPost(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ name: "Template A", title: "Title A", tags: ["a"] }),
    }),
    deps,
  )
  assert.equal(createdResponse.status, 201)
  const created = await createdResponse.json()

  const userAListResponse = await handleTemplatesGet(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-a" },
    }),
    deps,
  )
  const userAList = await userAListResponse.json()
  assert.equal(userAList.templates.length, 1)
  assert.equal(userAList.templates[0].id, created.id)

  const userAUpdate = await handleTemplatePut(
    new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ title: "  Title A Updated  " }),
    }),
    created.id,
    deps,
  )
  assert.equal(userAUpdate.status, 200)

  const updated = await userAUpdate.json()
  assert.equal(updated.title, "Title A Updated")

  const userADelete = await handleTemplateDelete(
    new Request("http://localhost", {
      method: "DELETE",
      headers: { authorization: "Bearer user-a" },
    }),
    created.id,
    deps,
  )
  assert.equal(userADelete.status, 200)

  const userAListAfterDeleteResponse = await handleTemplatesGet(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-a" },
    }),
    deps,
  )
  const userAListAfterDelete = await userAListAfterDeleteResponse.json()
  assert.equal(userAListAfterDelete.templates.length, 0)
})

test("dashboard stream template handlers enforce cross-user isolation", async () => {
  const deps = createDeps()

  const createUserATemplate = await handleTemplatesPost(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-a" },
      body: JSON.stringify({ name: "Template A", title: "Title A", tags: ["a"] }),
    }),
    deps,
  )
  assert.equal(createUserATemplate.status, 201)
  const userATemplate = await createUserATemplate.json()

  const createUserBTemplate = await handleTemplatesPost(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer user-b" },
      body: JSON.stringify({ name: "Template B", title: "Title B", tags: ["b"] }),
    }),
    deps,
  )
  assert.equal(createUserBTemplate.status, 201)
  const userBTemplate = await createUserBTemplate.json()

  const userBUpdateOnA = await handleTemplatePut(
    new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer user-b" },
      body: JSON.stringify({ title: "Hacked" }),
    }),
    userATemplate.id,
    deps,
  )
  assert.equal(userBUpdateOnA.status, 404)

  const userADeleteOnB = await handleTemplateDelete(
    new Request("http://localhost", {
      method: "DELETE",
      headers: { authorization: "Bearer user-a" },
    }),
    userBTemplate.id,
    deps,
  )
  assert.equal(userADeleteOnB.status, 404)

  const userBListResponse = await handleTemplatesGet(
    new Request("http://localhost", {
      headers: { authorization: "Bearer user-b" },
    }),
    deps,
  )
  const userBList = await userBListResponse.json()
  assert.equal(userBList.templates.length, 1)
  assert.equal(userBList.templates[0].id, userBTemplate.id)
})
