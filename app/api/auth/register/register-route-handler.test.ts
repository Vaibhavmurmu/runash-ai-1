import assert from "node:assert/strict"
import test from "node:test"

import { handleRegisterRequest } from "./register-route-handler"

const successfulRateLimit = async () => ({ success: true, remaining: 9, reset: Date.now() + 1000 })
const noCaptchaFailure = async () => null

test("POST /api/auth/register returns success payload for unified sign-up flow", async () => {
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "RunAsh User",
      username: "runash-user",
      email: "user@example.com",
      password: "Str0ng@Pass",
    }),
  })

  const response = await handleRegisterRequest(request, {
    enforceRateLimit: successfulRateLimit as never,
    applyCaptcha: noCaptchaFailure as never,
    findExistingUsername: async () => null,
    signUpEmail: async () => ({
      token: "session-token",
      user: {
        id: "u_1",
        email: "user@example.com",
        name: "RunAsh User",
        emailVerified: true,
      },
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.message, "User created successfully.")
  assert.equal(payload.user.id, "u_1")
  assert.equal(payload.user.email, "user@example.com")
  assert.equal(payload.user.username, "runash-user")
})

test("POST /api/auth/register maps duplicate email from Better Auth to legacy USER_EXISTS contract", async () => {
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "RunAsh User",
      username: "runash-user-two",
      email: "duplicate@example.com",
      password: "Str0ng@Pass",
    }),
  })

  const response = await handleRegisterRequest(request, {
    enforceRateLimit: successfulRateLimit as never,
    applyCaptcha: noCaptchaFailure as never,
    findExistingUsername: async () => null,
    signUpEmail: async () => ({
      error: {
        status: 422,
        message: "User already exists. Use another email",
      },
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 409)
  assert.equal(payload.error.code, "USER_EXISTS")
  assert.equal(payload.message, "User with this email already exists")
})

test("POST /api/auth/register keeps verification-required response contract when sign-up returns no session token", async () => {
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Needs Verification",
      username: "needs-verification",
      email: "verify@example.com",
      password: "Str0ng@Pass",
    }),
  })

  const response = await handleRegisterRequest(request, {
    enforceRateLimit: successfulRateLimit as never,
    applyCaptcha: noCaptchaFailure as never,
    findExistingUsername: async () => null,
    signUpEmail: async () => ({
      token: null,
      user: {
        id: "u_2",
        email: "verify@example.com",
        name: "Needs Verification",
        emailVerified: false,
      },
    }),
  })

  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.message, "User created successfully. Please check your email to verify your account.")
  assert.equal(payload.user.emailVerified, false)
})
