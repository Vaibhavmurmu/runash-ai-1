import assert from "node:assert/strict"
import test from "node:test"
import { handleGetTemplateById } from "./[id]/template-by-id-route-handler"

const session = {
  user: {
    id: "user_1",
    role: "user",
    ssoOrganization: null,
  },
} as any

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
  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => session,
    getTemplateById: async () => template,
    getTemplateByIdForViewer: async () => template,
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.id, "tmpl_1")
  assert.equal(payload.counters.downloadCount, 0)
})

test("GET /api/templates/[id] returns 404 when template does not exist", async () => {
  const response = await handleGetTemplateById("missing", {
    getSession: async () => session,
    getTemplateById: async () => null,
    getTemplateByIdForViewer: async () => template,
  })

  const payload = await response.json()
  assert.equal(response.status, 404)
  assert.equal(payload.error, "Template not found")
})

test("GET /api/templates/[id] enforces auth", async () => {
  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => null,
    getTemplateById: async () => template,
    getTemplateByIdForViewer: async () => template,
  })

  assert.equal(response.status, 401)
})

test("GET /api/templates/[id] returns 403 when viewer cannot access template", async () => {
  const response = await handleGetTemplateById("tmpl_1", {
    getSession: async () => session,
    getTemplateById: async () => template,
    getTemplateByIdForViewer: async () => null,
  })

  assert.equal(response.status, 403)
})
