import assert from "node:assert/strict"
import test from "node:test"

import { handleCommunityRegisterPostRequest } from "./register-route-handler"

test("POST /api/community/register returns 401 when user is not authenticated", async () => {
  const request = new Request("http://localhost/api/community/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "evt-ai-2026-01" }),
  })

  const response = await handleCommunityRegisterPostRequest(request, {
    getSession: async () => null,
    register: async () => {
      throw new Error("Should not call register when unauthenticated")
    },
    audit: async (_input) => {},
  })

  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error.code, "UNAUTHORIZED")
})

test("POST /api/community/register returns 404 for unknown event", async () => {
  const request = new Request("http://localhost/api/community/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "evt-missing" }),
  })

  const response = await handleCommunityRegisterPostRequest(request, {
    getSession: async () => ({
      user: { id: "user-1", email: null, name: null },
      session: { id: "session-1", activeOrganizationId: null },
    }),
    register: async () => ({ status: "invalid_event" }),
    audit: async (_input) => {},
  })

  const payload = await response.json()

  assert.equal(response.status, 404)
  assert.equal(payload.error.code, "INVALID_EVENT")
})

test("POST /api/community/register returns 201 for first registration", async () => {
  const request = new Request("http://localhost/api/community/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "evt-ai-2026-01" }),
  })

  let capturedInput: { eventId: string; userId: string; source: string } | null = null

  const response = await handleCommunityRegisterPostRequest(request, {
    getSession: async () => ({
      user: { id: "user-1", email: null, name: null },
      session: { id: "session-1", activeOrganizationId: null },
    }),
    register: async (input) => {
      capturedInput = input
      return {
        status: "created",
        registration: {
          id: "reg-1",
          eventId: "evt-ai-2026-01",
          userId: "user-1",
          source: "community_api",
          status: "registered",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    },
    audit: async (_input) => {},
  })

  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.deepEqual(capturedInput, { eventId: "evt-ai-2026-01", userId: "user-1", source: "community_api" })
  assert.equal(payload.ok, true)
  assert.equal(payload.alreadyRegistered, false)
  assert.equal(payload.status, "registered")
})

test("POST /api/community/register returns 409 for duplicate registration", async () => {
  const request = new Request("http://localhost/api/community/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "evt-ai-2026-01" }),
  })

  const response = await handleCommunityRegisterPostRequest(request, {
    getSession: async () => ({
      user: { id: "user-1", email: null, name: null },
      session: { id: "session-1", activeOrganizationId: null },
    }),
    register: async () => ({
      status: "already_registered",
      registration: {
        id: "reg-1",
        eventId: "evt-ai-2026-01",
        userId: "user-1",
        source: "community_api",
        status: "registered",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
    audit: async (_input) => {},
  })

  const payload = await response.json()

  assert.equal(response.status, 409)
  assert.equal(payload.ok, true)
  assert.equal(payload.code, "ALREADY_REGISTERED")
  assert.equal(payload.alreadyRegistered, true)
  assert.equal(payload.status, "registered")
})
