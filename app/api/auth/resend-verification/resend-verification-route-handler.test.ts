import assert from "node:assert/strict"
import test from "node:test"

import { handleResendVerificationRequest } from "./resend-verification-route-handler"

const successfulRateLimit = async () => ({ success: true, remaining: 9, reset: Date.now() + 1000 })

test("POST /api/auth/resend-verification sends through Better Auth when verification is pending", async () => {
  const request = new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "CaseSensitive@Example.com" }),
  })

  let sendInput: { headers: Headers; body: { email: string; callbackURL?: string } } | null = null

  const response = await handleResendVerificationRequest(request, {
    enforceRateLimit: successfulRateLimit as never,
    findUserByEmail: async () => ({ id: "u_1", email_verified: false }),
    sendVerificationEmail: async (input) => {
      sendInput = input
      return { ok: true }
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.message, "If an account with that email exists, we've sent a verification link.")
  assert.equal(sendInput?.body.email, "casesensitive@example.com")
  assert.equal(sendInput?.body.callbackURL, "http://localhost:3000/login?emailVerified=1")
})

test("POST /api/auth/resend-verification keeps generic response for unknown/verified users", async () => {
  const request = new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "verified@example.com" }),
  })

  let sendCallCount = 0

  const response = await handleResendVerificationRequest(request, {
    enforceRateLimit: successfulRateLimit as never,
    findUserByEmail: async () => ({ id: "u_2", email_verified: true }),
    sendVerificationEmail: async () => {
      sendCallCount += 1
      return { ok: true }
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.message, "If an account with that email exists, we've sent a verification link.")
  assert.equal(sendCallCount, 0)
})

test("POST /api/auth/resend-verification returns 429 on rate-limit failures", async () => {
  const request = new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "rate@example.com" }),
  })

  const response = await handleResendVerificationRequest(request, {
    enforceRateLimit: async () => ({ success: false, remaining: 0, reset: Date.now() + 1000 }) as never,
    findUserByEmail: async () => null,
    sendVerificationEmail: async () => ({ ok: true }),
  })

  const payload = await response.json()

  assert.equal(response.status, 429)
  assert.equal(payload.message, "Too many resend attempts. Please try again later.")
})
