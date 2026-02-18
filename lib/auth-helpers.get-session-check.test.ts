import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

import { auth } from "./auth.ts"

test("auth exports a Better Auth instance with api.getSession", () => {
  assert.ok(auth)
  assert.equal(typeof auth.api?.getSession, "function")
})

test("auth-helpers getSession delegates to shared auth module session accessor", async () => {
  const source = await readFile(new URL("./auth-helpers.ts", import.meta.url), "utf8")

  assert.match(source, /export\s+async\s+function\s+getSession\s*\(/)
  assert.match(source, /readSessionFromHeaders\s*=\s*dependencies\.readSessionFromHeaders\s*\?\?\s*getAuthSessionFromHeaders/)
  assert.match(source, /return\s+readSessionFromHeaders\(requestHeaders\)/)
  assert.match(source, /from\s+"@\/lib\/auth"/)
})
