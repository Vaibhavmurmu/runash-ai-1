import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { respondAdminError } from "@/lib/api/admin-route-utils"

function buildRequest() {
  return new NextRequest("http://localhost/api/admin/users", {
    headers: {
      "x-request-id": "req_admin_contract",
    },
  })
}

test("respondAdminError returns envelope contract for 401 and 403", async () => {
  const unauthorized = respondAdminError(buildRequest(), 401, "Unauthorized")
  const forbidden = respondAdminError(buildRequest(), 403, "Forbidden")

  assert.equal(unauthorized.status, 401)
  assert.equal(forbidden.status, 403)

  const unauthorizedPayload = await unauthorized.json()
  const forbiddenPayload = await forbidden.json()

  assert.deepEqual(unauthorizedPayload, {
    success: false,
    data: null,
    error: { code: "UNAUTHORIZED", message: "Unauthorized" },
    requestId: "req_admin_contract",
  })

  assert.deepEqual(forbiddenPayload, {
    success: false,
    data: null,
    error: { code: "FORBIDDEN", message: "Forbidden" },
    requestId: "req_admin_contract",
  })
})
