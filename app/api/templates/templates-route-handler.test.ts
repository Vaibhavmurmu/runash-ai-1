import assert from "node:assert/strict"
import test from "node:test"

import { handleGetTemplates, handlePostTemplate } from "./templates-route-handler"

const session = {
  user: {
    id: "user_1",
    name: "Tester",
    role: "user",
    ssoOrganization: 7,
  },
} as any

test("GET /api/templates applies category and tags filters through repository", async () => {
  let capturedFilters: { category?: string | null; tags?: string[] } | null = null

  const response = await handleGetTemplates(new Request("http://localhost/api/templates?category=overlay&tags=clean&tags=modern"), {
    getSession: async () => session,
    listTemplates: async (filters) => {
      capturedFilters = filters
      return [
        {
          id: "tmpl_1",
          name: "Overlay",
          description: "d",
          category: "overlay",
          thumbnailUrl: null,
          variables: [],
          html: "<div />",
          css: "",
          isPremium: false,
          tags: ["clean"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          downloadCount: 0,
          viewCount: 0,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          author: "Tester",
          ownerUserId: "user_1",
          workspaceId: null,
          accessLevel: "public",
        },
      ]
    },
    createTemplate: async () => {
      throw new Error("unexpected")
    },
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(capturedFilters, { category: "overlay", tags: ["clean", "modern"] })
  assert.equal(payload.templates.length, 1)
})

test("POST /api/templates creates a persistent template", async () => {
  let capturedInput: Record<string, unknown> | null = null

  const response = await handlePostTemplate(
    new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: "My Template",
        category: "overlay",
        html: "<div>Hello</div>",
        css: ".x{}",
        tags: ["new"],
      }),
    }),
    {
      getSession: async () => session,
      listTemplates: async () => [],
      createTemplate: async (input) => {
        capturedInput = input as unknown as Record<string, unknown>
        return {
          id: "custom-1",
          name: "My Template",
          description: null,
          category: "overlay",
          thumbnailUrl: null,
          variables: [],
          html: "<div>Hello</div>",
          css: ".x{}",
          isPremium: false,
          tags: ["new"],
          createdAt: "2026-03-08T00:00:00.000Z",
          updatedAt: "2026-03-08T00:00:00.000Z",
          downloadCount: 0,
          viewCount: 0,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          author: "Tester",
          ownerUserId: "user_1",
          workspaceId: 7,
          accessLevel: "public",
        }
      },
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.template.id, "custom-1")
  assert.equal(capturedInput?.ownerUserId, "user_1")
  assert.equal(capturedInput?.workspaceId, 7)
  assert.equal(capturedInput?.accessLevel, "public")
})
