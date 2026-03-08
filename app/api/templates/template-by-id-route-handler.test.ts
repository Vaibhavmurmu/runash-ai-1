import assert from "node:assert/strict"
import test from "node:test"
import { handleGetTemplateById } from "./[id]/template-by-id-route-handler"

const session = {
  user: {
    id: "user_1",
    role: "user",
    ssoOrganization: null,
  },
} as const as any

const template = {
  id: "tmpl_1",
  name: "Template",
  description: null,
  category: "overlay",
  thumbnailUrl: null,
  variables: [],
  html: "<div></div>",
  css: "",
  javascript: null,
  isPremium: false,
  scope: "public",
  tags: [],
  createdAt: "2026-03-08T00:00:00.000Z",
  updatedAt: "2026-03-08T00:00:00.000Z",
  downloadCount: 0,
  viewCount: 0,
  usageCount: 0,
  rating: 0,
  ratingCount: 0,
  author: "RunAsh",
  ownerUserId: "user_1",
  workspaceId: null,
} as const

test("GET /api/templates/[id] returns template payload", async () => {
  let capturedViewer: { userId: string; role: string; workspaceId: number | null } | null = null

  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => session,
    getTemplateByIdWithAccess: async (_id, viewer) => {
      capturedViewer = viewer
      return { status: "ok", template }
    },
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.id, "tmpl_1")
  assert.equal(payload.counters.downloadCount, 0)
  assert.deepEqual(capturedViewer, {
    userId: "user_1",
    role: "user",
    workspaceId: null,
  })
})

test("GET /api/templates/[id] enforces auth", async () => {
  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => null,
    getTemplateByIdWithAccess: async () => ({ status: "ok", template }),
  })

  assert.equal(response.status, 401)
})

test("GET /api/templates/[id] returns 403 when viewer cannot access template", async () => {
  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => session,
    getTemplateByIdWithAccess: async () => ({ status: "forbidden" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 403)
  assert.equal(payload.error, "Forbidden")
})

test("GET /api/templates/[id] returns 404 when template does not exist", async () => {
  const response = await handleGetTemplateById("missing", {
    getSession: async () => session,
    getTemplateByIdWithAccess: async () => ({ status: "not_found" }),
  })

  const payload = await response.json()
  assert.equal(response.status, 404)
  assert.equal(payload.error, "Template not found")
})

test("GET /api/templates/[id] returns 400 for malformed template id", async () => {
  const response = await handleGetTemplateById("bad id", {
    getSession: async () => session,
    getTemplateByIdWithAccess: async () => ({ status: "ok", template }),
  })

  const payload = await response.json()
  assert.equal(response.status, 400)
  assert.equal(payload.error, "Malformed template id")
})
