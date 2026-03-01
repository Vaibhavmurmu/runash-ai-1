import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import { buildAuthzErrorResponse } from "@/lib/api/route-auth"

function buildRequest() {
  return new NextRequest("http://localhost/api/automation/workflows", {
    headers: {
      "x-request-id": "req_route_auth_contract",
    },
  })
}

test("route auth helper returns consistent unauthorized contract", async () => {
  const response = buildAuthzErrorResponse(buildRequest(), 401)
  assert.equal(response.status, 401)

  const payload = await response.json()
  assert.deepEqual(payload, {
    success: false,
    data: null,
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    },
    requestId: "req_route_auth_contract",
  })
})

test("route auth helper returns consistent forbidden contract", async () => {
  const response = buildAuthzErrorResponse(buildRequest(), 403)
  assert.equal(response.status, 403)

  const payload = await response.json()
  assert.deepEqual(payload, {
    success: false,
    data: null,
    error: {
      code: "FORBIDDEN",
      message: "Forbidden",
    },
    requestId: "req_route_auth_contract",
  })
})
