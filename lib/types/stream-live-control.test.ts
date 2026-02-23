import assert from "node:assert/strict"
import test from "node:test"

import { resolveVisibilityDefault } from "./stream-live-control.ts"

test("resolveVisibilityDefault uses private default for creators aged 13-17", () => {
  assert.equal(resolveVisibilityDefault(13), "private")
  assert.equal(resolveVisibilityDefault(17), "private")
})

test("resolveVisibilityDefault uses public default for creators aged 18+", () => {
  assert.equal(resolveVisibilityDefault(18), "public")
  assert.equal(resolveVisibilityDefault(42), "public")
})

test("resolveVisibilityDefault falls back to public when age is missing", () => {
  assert.equal(resolveVisibilityDefault(undefined), "public")
})
