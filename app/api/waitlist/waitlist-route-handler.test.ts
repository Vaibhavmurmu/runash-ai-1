import assert from "node:assert/strict"
import test from "node:test"

import { handleWaitlistPostRequest } from "./waitlist-route-handler"

const allowRateLimit = async () => ({ success: true, remaining: 4, resetTime: Date.now() + 1000 })

test("POST /api/waitlist returns 201 and success contract for valid payload", async () => {
  const request = new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "Founders@RunAsh.in",
      name: "RunAsh Founder",
      company: "RunAsh",
      useCase: "Streaming ops automation",
    }),
  })

  const response = await handleWaitlistPostRequest(request, {
    enforceRateLimit: allowRateLimit as never,
    join: async (input) => ({
      status: "created",
      entry: {
        id: "42",
        email: input.email,
        name: input.name ?? null,
        company: input.company ?? null,
        useCase: input.useCase ?? null,
        createdAt: new Date().toISOString(),
      },
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.success, true)
  assert.equal(payload.data.entry.email, "founders@runash.in")
  assert.equal(payload.data.message, "You’re on the waitlist! Please check your email for confirmation.")
})

test("POST /api/waitlist returns 400 for invalid payload", async () => {
  const request = new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "not-an-email",
    }),
  })

  const response = await handleWaitlistPostRequest(request, {
    enforceRateLimit: allowRateLimit as never,
    join: async () => {
      throw new Error("Should not reach join for invalid payload")
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.error.code, "VALIDATION_FAILED")
})

test("POST /api/waitlist returns duplicate response contract for existing email", async () => {
  const request = new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "duplicate@runash.in",
      useCase: "Duplicate submit",
    }),
  })

  const response = await handleWaitlistPostRequest(request, {
    enforceRateLimit: allowRateLimit as never,
    join: async () => ({
      status: "duplicate",
      entry: {
        id: "1",
        email: "duplicate@runash.in",
        name: null,
        company: null,
        useCase: "Duplicate submit",
        createdAt: new Date().toISOString(),
      },
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 409)
  assert.equal(payload.success, false)
  assert.equal(payload.error.code, "WAITLIST_DUPLICATE")
  assert.equal(payload.message, "This email is already on the waitlist")
})
