import assert from "node:assert/strict"
import test from "node:test"

import { handleVerifyMagicLink } from "./verify-magic-link-handler"

test("handleVerifyMagicLink issues session and cookie on success", async () => {
  const request = new Request("http://localhost/api/auth/magic-link/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.40",
      "user-agent": "magic-link-test",
    },
    body: JSON.stringify({ token: "valid-token" }),
  })

  let createSessionCalls = 0

  const response = await handleVerifyMagicLink(request, {
    verifyMagicLinkToken: async () => ({
      success: true,
      user: { id: 1, email: "magic@example.com", name: "Magic", role: "user", avatar_url: null },
    }),
    getAuthSecret: () => "test-auth-secret",
    createUserSession: async () => {
      createSessionCalls += 1
      return true
    },
    setSessionCookies: (res, token) => {
      res.cookies.set("better-auth.session-token", token)
    },
  })

  assert.equal(response.status, 200)
  assert.equal(createSessionCalls, 1)
  assert.match(response.headers.get("set-cookie") ?? "", /better-auth\.session-token=/)
})

test("handleVerifyMagicLink rejects invalid token", async () => {
  const request = new Request("http://localhost/api/auth/magic-link/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "bad-token" }),
  })

  const response = await handleVerifyMagicLink(request, {
    verifyMagicLinkToken: async () => ({ success: false, user: null }),
    getAuthSecret: () => "test-auth-secret",
    createUserSession: async () => true,
    setSessionCookies: () => {
      throw new Error("should not set cookies")
    },
  })

  assert.equal(response.status, 400)
  assert.equal(response.headers.get("set-cookie"), null)
})
