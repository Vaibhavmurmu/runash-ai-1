import assert from "node:assert/strict"
import test from "node:test"

import { handleVerifyEmailOtp } from "./verify-email-otp-handler"

const onError = () => Response.json({ success: false, message: "Internal server error" }, { status: 500 })

test("PUT /api/auth/otp/email login success creates session cookie", async () => {
  const request = new Request("http://localhost/api/auth/otp/email", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "user-agent": "otp-test-agent",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify({
      email: "login-user@example.com",
      code: "123456",
      purpose: "login",
    }),
  })

  const response = await handleVerifyEmailOtp(request, {
    verifyOtp: async () => ({ success: true, message: "OTP verified successfully" }),
    resolveOrCreateUserIdentity: async () => ({
      id: 42,
      email: "login-user@example.com",
      name: "Login User",
      role: "user",
    }),
    issueLoginSession: async () => "signed-session-token",
    setSessionCookies: (res, token) => {
      res.cookies.set("better-auth.session-token", token)
    },
    onError,
  })

  const payload = await response.json()
  const setCookieHeader = response.headers.get("set-cookie") ?? ""

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(payload.user.id, 42)
  assert.match(setCookieHeader, /better-auth\.session-token=signed-session-token/)
})

test("PUT /api/auth/otp/email invalid otp does not create session", async () => {
  const request = new Request("http://localhost/api/auth/otp/email", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "login-user@example.com",
      code: "000000",
      purpose: "login",
    }),
  })

  let issueSessionCalls = 0

  const response = await handleVerifyEmailOtp(request, {
    verifyOtp: async () => ({ success: false, message: "Invalid or expired OTP code" }),
    resolveOrCreateUserIdentity: async () => {
      throw new Error("should not resolve identity for failed OTP")
    },
    issueLoginSession: async () => {
      issueSessionCalls += 1
      return "should-not-be-used"
    },
    setSessionCookies: () => {
      throw new Error("setSessionCookies should not be called")
    },
    onError,
  })

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(issueSessionCalls, 0)
  assert.equal(response.headers.get("set-cookie"), null)
})

test("PUT /api/auth/otp/email replayed otp is rejected and no session is issued", async () => {
  const callResults = [
    { success: true, message: "OTP verified successfully" },
    { success: false, message: "Invalid or expired OTP code" },
  ]

  let verifyCallCount = 0
  let issuedSessionCount = 0
  let cookieSetCount = 0

  const dependencies = {
    verifyOtp: async () => callResults[verifyCallCount++] ?? { success: false, message: "Invalid or expired OTP code" },
    resolveOrCreateUserIdentity: async () => ({
      id: 100,
      email: "replay@example.com",
      name: "Replay User",
      role: "user",
    }),
    issueLoginSession: async () => {
      issuedSessionCount += 1
      return `session-${issuedSessionCount}`
    },
    setSessionCookies: (res: Response & { cookies: { set: (name: string, token: string) => void } }, token: string) => {
      cookieSetCount += 1
      res.cookies.set("better-auth.session-token", token)
    },
    onError,
  }

  const firstRequest = new Request("http://localhost/api/auth/otp/email", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "replay@example.com", code: "111111", purpose: "login" }),
  })

  const secondRequest = new Request("http://localhost/api/auth/otp/email", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "replay@example.com", code: "111111", purpose: "login" }),
  })

  const firstResponse = await handleVerifyEmailOtp(firstRequest, dependencies)
  const secondResponse = await handleVerifyEmailOtp(secondRequest, dependencies)

  assert.equal(firstResponse.status, 200)
  assert.equal(secondResponse.status, 400)
  assert.equal(issuedSessionCount, 1)
  assert.equal(cookieSetCount, 1)
  assert.match(firstResponse.headers.get("set-cookie") ?? "", /better-auth\.session-token=session-1/)
  assert.equal(secondResponse.headers.get("set-cookie"), null)
})

test("PUT /api/auth/otp/email non-login purpose does not issue session cookies", async () => {
  const request = new Request("http://localhost/api/auth/otp/email", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "register@example.com",
      code: "222222",
      purpose: "registration",
    }),
  })

  let issuedSession = false

  const response = await handleVerifyEmailOtp(request, {
    verifyOtp: async () => ({ success: true, message: "OTP verified successfully" }),
    resolveOrCreateUserIdentity: async () => {
      throw new Error("identity should not be resolved for non-login verification")
    },
    issueLoginSession: async () => {
      issuedSession = true
      return "should-not-be-issued"
    },
    setSessionCookies: () => {
      throw new Error("cookies should not be set for non-login verification")
    },
    onError,
  })

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(issuedSession, false)
  assert.equal(response.headers.get("set-cookie"), null)
})
