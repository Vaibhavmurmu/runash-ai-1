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
  isPremium: false,
  tags: [],
  createdAt: "2026-03-08T00:00:00.000Z",
  updatedAt: "2026-03-08T00:00:00.000Z",
  downloadCount: 0,
  viewCount: 0,
  usageCount: 0,
  rating: 0,
  ratingCount: 0,
  author: "RunAsh",
  ownerUserId: null,
  workspaceId: null,
  accessLevel: "public",
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
