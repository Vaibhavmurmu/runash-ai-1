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
  let capturedViewer: { userId: string; role: string; workspaceId: number | null } | null = null

  const response = await handleGetTemplates(new Request("http://localhost/api/templates?category=overlay&tags=clean&tags=modern"), {
    getSession: async () => session,
    listTemplatesForViewer: async (viewer, filters) => {
      capturedViewer = viewer
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
          javascript: null,
          isPremium: false,
          tags: ["clean"],
          scope: "public",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          downloadCount: 0,
          viewCount: 0,
          usageCount: 0,
          rating: 0,
          ratingCount: 0,
          author: "Tester",
          ownerUserId: "user_1",
          workspaceId: 7,
        },
      ]
    },
    createTemplate: async () => {
      throw new Error("unexpected")
    },
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(capturedViewer, { userId: "user_1", role: "user", workspaceId: 7 })
  assert.deepEqual(capturedFilters, { category: "overlay", tags: ["clean", "modern"] })
  assert.equal(payload.templates.length, 1)
})

test("GET /api/templates enforces auth", async () => {
  const response = await handleGetTemplates(new Request("http://localhost/api/templates"), {
    getSession: async () => null,
    listTemplatesForViewer: async () => [],
    createTemplate: async () => {
      throw new Error("unexpected")
    },
  })

  assert.equal(response.status, 401)
})

test("POST /api/templates creates a persistent template", async () => {
  let capturedInput: Record<string, unknown> | null = null
  let capturedActor: Record<string, unknown> | null = null

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
      listTemplatesForViewer: async () => [],
      createTemplate: async (input, actor) => {
        capturedInput = input as unknown as Record<string, unknown>
        capturedActor = actor as unknown as Record<string, unknown>
        return {
          id: "custom-1",
          name: "My Template",
          description: null,
          category: "overlay",
          thumbnailUrl: null,
          variables: [],
          html: "<div>Hello</div>",
          css: ".x{}",
          javascript: null,
          isPremium: false,
          tags: ["new"],
          scope: "public",
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
        }
      },
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.template.id, "custom-1")
  assert.equal(capturedInput?.name, "My Template")
  assert.equal(capturedActor?.userId, "user_1")
  assert.equal(capturedActor?.workspaceId, 7)
})

test("POST /api/templates validates payload", async () => {
  const response = await handlePostTemplate(
    new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({
        category: "overlay",
        html: "<div>Hello</div>",
        css: ".x{}",
      }),
    }),
    {
      getSession: async () => session,
      listTemplatesForViewer: async () => [],
      createTemplate: async () => {
        throw new Error("unexpected")
      },
    },
  )

  assert.equal(response.status, 400)
})

test("POST /api/templates enforces auth", async () => {
  const response = await handlePostTemplate(
    new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({ name: "a", category: "b", html: "c", css: "d" }),
    }),
    {
      getSession: async () => null,
      listTemplatesForViewer: async () => [],
      createTemplate: async () => {
        throw new Error("unexpected")
      },
    },
  )

  assert.equal(response.status, 401)
})
