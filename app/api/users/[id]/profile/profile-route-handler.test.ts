import assert from "node:assert/strict"
import test from "node:test"

import { handleGetUserProfile, handlePatchUserProfile } from "./profile-route-handler"

function makeRequest(method: string, body?: Record<string, unknown>) {
  return new Request("http://localhost/api/users/10/profile", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }) as any
}

test("GET user profile blocks cross-tenant reads", async () => {
  const response = await handleGetUserProfile(makeRequest("GET"), { id: "10" }, {
    getSession: async () => ({ user: { id: "99", ssoOrganization: 2 } } as any),
    query: async () => [],
  })

  assert.equal(response.status, 404)
})

test("GET user profile allows same-tenant reads", async () => {
  const response = await handleGetUserProfile(makeRequest("GET"), { id: "10" }, {
    getSession: async () => ({ user: { id: "99", ssoOrganization: 2 } } as any),
    query: async () => [{ id: 10, sso_organization_id: 2, name: "Tenant user" }],
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.id, 10)
})

test("PATCH user profile blocks cross-tenant updates", async () => {
  let callCount = 0
  const response = await handlePatchUserProfile(makeRequest("PATCH", { name: "Updated" }), { id: "10" }, {
    getSession: async () => ({ user: { id: "10", role: "user", ssoOrganization: 2 } } as any),
    query: async () => {
      callCount += 1
      if (callCount === 1) {
        return [{ id: "10", sso_organization_id: 8 }]
      }
      return []
    },
  })

  assert.equal(response.status, 403)
})

test("PATCH user profile allows same-tenant updates", async () => {
  let callCount = 0
  const response = await handlePatchUserProfile(makeRequest("PATCH", { name: "Updated" }), { id: "10" }, {
    getSession: async () => ({ user: { id: "10", role: "user", ssoOrganization: 2 } } as any),
    query: async () => {
      callCount += 1
      if (callCount === 1) {
        return [{ id: "10", sso_organization_id: 2 }]
      }
      return [{ id: "10", name: "Updated", sso_organization_id: 2 }]
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.name, "Updated")
})
