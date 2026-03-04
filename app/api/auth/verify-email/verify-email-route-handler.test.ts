import { NextRequest } from "next/server"
import assert from "node:assert/strict"
import test from "node:test"

import { handleVerifyEmailGet } from "./verify-email-route-handler"

const successfulRateLimit = async () => ({ success: true, remaining: 9, reset: Date.now() + 1000 })

test("GET /api/auth/verify-email handles invalid token", async () => {
  const request = new NextRequest("http://localhost/api/auth/verify-email?token=invalid-token")

  const response = await handleVerifyEmailGet(request, {
    enforceRateLimit: successfulRateLimit as never,
    verifyEmail: async () => {
      throw new Error("invalid token")
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.message, "Invalid or expired verification token")
})

test("GET /api/auth/verify-email handles expired token", async () => {
  const request = new NextRequest("http://localhost/api/auth/verify-email?token=expired-token")

  const response = await handleVerifyEmailGet(request, {
    enforceRateLimit: successfulRateLimit as never,
    verifyEmail: async () => {
      throw new Error("token expired")
    },
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.message, "Invalid or expired verification token")
})

test("GET /api/auth/verify-email treats already-verified email as success", async () => {
  const request = new NextRequest("http://localhost/api/auth/verify-email?token=already-verified")

  const response = await handleVerifyEmailGet(request, {
    enforceRateLimit: successfulRateLimit as never,
    verifyEmail: async () => ({ status: true, user: null }),
  })

  assert.equal(response.status, 307)
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?emailVerified=1")
})
