import assert from "node:assert/strict"
import test from "node:test"

import { requireSellerSessionUserId } from "./_auth"

function buildRequest() {
  return new Request("http://localhost/api/seller/settings", {
    headers: {
      "x-request-id": "req_test_seller_auth",
    },
  })
}

test("seller auth returns 401 when session is missing", async () => {
  const result = await requireSellerSessionUserId(buildRequest(), {
    getSession: async () => null,
  })

  assert.ok(result instanceof Response)
  assert.equal(result.status, 401)
})

test("seller auth returns 403 for authenticated non-seller role", async () => {
  const result = await requireSellerSessionUserId(buildRequest(), {
    getSession: async () => ({ user: { id: "12", role: "user", ssoOrganization: null } }),
  })

  assert.ok(result instanceof Response)
  assert.equal(result.status, 403)
})

test("seller auth allows seller role", async () => {
  const result = await requireSellerSessionUserId(buildRequest(), {
    getSession: async () => ({ user: { id: "27", role: "seller", ssoOrganization: null } }),
  })

  assert.equal(result, 27)
})



test("seller auth returns 403 when session user id is not numeric", async () => {
  const result = await requireSellerSessionUserId(buildRequest(), {
    getSession: async () => ({ user: { id: "user_12", role: "seller", ssoOrganization: null } }),
  })

  assert.ok(result instanceof Response)
  assert.equal(result.status, 403)
})

test("seller auth scopes to session user id even when x-user-id header is mismatched", async () => {
  const request = new Request("http://localhost/api/seller/settings", {
    headers: {
      "x-request-id": "req_test_seller_auth_mismatch",
      "x-user-id": "999",
    },
  })

  const result = await requireSellerSessionUserId(request, {
    getSession: async () => ({ user: { id: "27", role: "seller", ssoOrganization: null } }),
  })

  assert.equal(result, 27)
})
