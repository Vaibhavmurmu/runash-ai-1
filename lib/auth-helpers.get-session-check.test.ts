import assert from "node:assert/strict"
import test from "node:test"

import { auth } from "./auth.ts"
import { getSession } from "./auth-helpers"

test("auth exports a Better Auth instance with api.getSession", () => {
  assert.ok(auth)
  assert.equal(typeof auth.api?.getSession, "function")
})

test("getSession delegates to injected session reader with cookie header", async () => {
  let capturedHeaders: Headers | undefined
  const expectedSession = { user: { id: "u_123" } }

  const session = await getSession({
    getCookieHeader: async () => "session=abc123; theme=dark",
    readSessionFromHeaders: async (requestHeaders) => {
      capturedHeaders = requestHeaders
      return expectedSession as Awaited<ReturnType<typeof getSession>>
    },
  })

  assert.deepEqual(session, expectedSession)
  assert.equal(capturedHeaders?.get("cookie"), "session=abc123; theme=dark")
})

test("getSession returns null and skips reader when cookie header is empty", async () => {
  let readerCalled = false

  const session = await getSession({
    getCookieHeader: async () => "",
    readSessionFromHeaders: async () => {
      readerCalled = true
      return null
    },
  })

  assert.equal(session, null)
  assert.equal(readerCalled, false)
})
