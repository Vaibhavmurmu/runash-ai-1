import assert from "node:assert/strict"
import test from "node:test"

import { handleSubscribePostRequest } from "@/app/api/subscribe/route"

function createRequest(email: unknown): Request {
  return new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "subscribe-test",
    },
    body: JSON.stringify({ email }),
  })
}

test("POST /api/subscribe returns 400 for invalid email", async () => {
  const response = await handleSubscribePostRequest(createRequest("not-an-email"), {
    upsert: async () => {
      throw new Error("should not upsert invalid payload")
    },
    now: () => Date.now(),
    ipLimits: new Map(),
    emailLimits: new Map(),
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.ok, false)
  assert.equal(payload.error, "invalid_email")
})

test("POST /api/subscribe returns 201 for first subscribe", async () => {
  const response = await handleSubscribePostRequest(createRequest("NewUser@RunAsh.in"), {
    upsert: async ({ email, metadata }) => {
      assert.equal(email, "newuser@runash.in")
      assert.equal(metadata.source, "api/subscribe")
      assert.equal(metadata.ip, "203.0.113.10")

      return {
        createdNew: true,
        record: {
          id: "1",
          email,
          metadata,
          createdAt: new Date().toISOString(),
        },
      }
    },
    now: () => Date.now(),
    ipLimits: new Map(),
    emailLimits: new Map(),
  })

  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.ok, true)
  assert.equal(payload.email, "newuser@runash.in")
  assert.equal(payload.alreadySubscribed, false)
})

test("POST /api/subscribe returns idempotent success for duplicate subscribe", async () => {
  const response = await handleSubscribePostRequest(createRequest("duplicate@runash.in"), {
    upsert: async ({ email, metadata }) => ({
      createdNew: false,
      record: {
        id: "2",
        email,
        metadata,
        createdAt: new Date().toISOString(),
      },
    }),
    now: () => Date.now(),
    ipLimits: new Map(),
    emailLimits: new Map(),
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.email, "duplicate@runash.in")
  assert.equal(payload.alreadySubscribed, true)
})

test("POST /api/subscribe returns 500 on storage failure", async () => {
  const response = await handleSubscribePostRequest(createRequest("fails@runash.in"), {
    upsert: async () => {
      throw new Error("db unavailable")
    },
    now: () => Date.now(),
    ipLimits: new Map(),
    emailLimits: new Map(),
  })

  const payload = await response.json()

  assert.equal(response.status, 500)
  assert.equal(payload.ok, false)
  assert.equal(payload.email, "fails@runash.in")
  assert.equal(payload.error, "storage_failure")
})
