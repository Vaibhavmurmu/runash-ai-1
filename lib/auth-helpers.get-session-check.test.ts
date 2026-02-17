import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

import { auth } from "./auth.ts"

test("auth exports a Better Auth instance with api.getSession", () => {
  assert.ok(auth)
  assert.equal(typeof auth.api?.getSession, "function")
})

test("auth-helpers getSession uses auth.api.getSession", async () => {
  const source = await readFile(new URL("./auth-helpers.ts", import.meta.url), "utf8")

  assert.match(source, /export\s+async\s+function\s+getSession\s*\(/)
  assert.match(source, /readSession\s*=\s*dependencies\.readSession\s*\?\?\s*auth\.api\.getSession/)
  assert.match(source, /const\s+session\s*=\s*await\s+readSession\s*\(\{\s*headers:\s*requestHeaders,?\s*\}\)/s)
})
