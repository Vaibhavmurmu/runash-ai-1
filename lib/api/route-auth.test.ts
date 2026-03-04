import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest } from "next/server"

import {
  buildAuthzErrorResponse,
  enforceTenantBoundaryForUser,
  resolveSessionOrganizationId,
} from "@/lib/api/route-auth"

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

test("resolveSessionOrganizationId reads sso organization from session", () => {
  const orgId = resolveSessionOrganizationId({ user: { id: "1", ssoOrganization: 42 } } as any)
  assert.equal(orgId, 42)
})

test("enforceTenantBoundaryForUser allows legacy null org and requests migration", async () => {
  const result = await enforceTenantBoundaryForUser("5", 11, async () => null)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.shouldMigrateLegacyOrganization, true)
  }
})

test("enforceTenantBoundaryForUser blocks cross-tenant access", async () => {
  const result = await enforceTenantBoundaryForUser("5", 11, async () => 99)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 403)
  }
})
